import (
	"context"
	"errors"
	"net/http"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/authn/casdoor"
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/authz/embpdp"
	"github.com/goplus/builder/spx-backend/internal/authz/quota"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/redis/go-redis/v9"
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

// Initialize database.
db, err := model.OpenDB(context.Background(), cfg.Database.DSN, 0, 0)
if err != nil {
	logger.Fatalln("failed to open database:", err)
}
// TODO: Configure connection pool and timeouts.

// Initialize authenticator.
authenticator := casdoor.New(db, cfg.Casdoor)

// Initialize authorizer and Redis.
var quotaTracker authz.QuotaTracker
var redisClient *redis.Client
if cfg.Redis.Addr != "" {
	quotaTracker = quota.NewRedisQuotaTracker(cfg.Redis)
	logger.Printf("using redis quota tracker at %s", cfg.Redis.GetAddr())
	// Initialize Redis client for controller
	redisClient = redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.GetAddr(),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
		PoolSize: cfg.Redis.GetPoolSize(),
	})
	// Test Redis connection
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		logger.Printf("warning: redis ping failed: %v", err)
	}
} else {
	quotaTracker = quota.NewNopQuotaTracker()
	logger.Println("using no-op quota tracker")
}
pdp := embpdp.New(quotaTracker)
authorizer := authz.New(db, pdp, quotaTracker)

// Initialize controller.
ctrl, err = controller.New(context.Background(), db, cfg, redisClient)
if err != nil {
	logger.Fatalln("failed to create a new controller:", err)
}

// Start server.

addr := cfg.Server.GetServerAddr()
logger.Printf("listening to %s", addr)

h := handler(
	authorizer.Middleware(),
	authn.Middleware(authenticator),
	NewCORSMiddleware(),
	NewReqIDMiddleware(),
)
server := &http.Server{
	Addr:         addr,
	Handler:      h,
	ReadTimeout:  cfg.Server.ReadTimeout,
	WriteTimeout: cfg.Server.WriteTimeout,
}

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
