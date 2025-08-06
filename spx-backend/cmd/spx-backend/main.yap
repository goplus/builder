import (
	"context"
	"errors"
	"net/http"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/getsentry/sentry-go"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/authn/casdoor"
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/authz/embpdp"
	"github.com/goplus/builder/spx-backend/internal/authz/quota"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

const (
	firstPageIndex  = 1
	defaultPageSize = 10
)

var (
	ctrl *controller.Controller
)

logger := log.GetLogger()

// Load configuration.
cfg, err := config.Load(logger)
if err != nil {
	logger.Fatalln("failed to load configuration:", err)
}

// Initialize Sentry
err = sentry.Init(sentry.ClientOptions{
	Dsn:              cfg.Sentry.DSN,
	EnableTracing:    true,
	TracesSampleRate: cfg.Sentry.SampleRate,
})
if err != nil {
	logger.Fatalln("failed to initialize sentry:", err)
}
defer sentry.Flush(10 * time.Second)

// Initialize database.
db, err := model.OpenDB(context.Background(), cfg.Database.DSN, 0, 0)
if err != nil {
	logger.Fatalln("failed to open database:", err)
}
// TODO: Configure connection pool and timeouts.

// Initialize authenticator.
authenticator := casdoor.New(db, cfg.Casdoor)

// Initialize authorizer.
var quotaTracker authz.QuotaTracker
if cfg.Redis.Addr != "" {
	quotaTracker = quota.NewRedisQuotaTracker(cfg.Redis)
	logger.Printf("using redis quota tracker at %s", cfg.Redis.GetAddr())
} else {
	quotaTracker = quota.NewNopQuotaTracker()
	logger.Println("using no-op quota tracker")
}
pdp := embpdp.New(quotaTracker)
authorizer := authz.New(db, pdp, quotaTracker)

// Initialize controller.
ctrl, err = controller.New(context.Background(), db, cfg)
if err != nil {
	logger.Fatalln("failed to create a new controller:", err)
}

// Start server.

port := cfg.Server.GetPort()
logger.Printf("listening to %s", port)

h := handler(
	authorizer.Middleware(),
	authn.Middleware(authenticator),
	NewCORSMiddleware(),
	NewReqIDMiddleware(),
	NewSentryMiddleware(),
)
server := &http.Server{Addr: port, Handler: h}

stopCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
defer stop()
var serverErr error
go func() {
	serverErr = server.ListenAndServe()
	stop()
}()
<-stopCtx.Done()
if serverErr != nil && !errors.Is(serverErr, http.ErrServerClosed) {
	logger.Fatalln("server error:", serverErr)
}

shutdownCtx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()
if err := server.Shutdown(shutdownCtx); err != nil {
	logger.Fatalln("failed to gracefully shut down:", err)
}
