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
	err  error
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

// Initialize controller.
ctrl, err = controller.New(context.Background(), db, cfg)
if err != nil {
	logger.Fatalln("failed to create a new controller:", err)
}

// Initialize authenticator.
authenticator := casdoor.New(db, cfg.Casdoor)

port := cfg.Server.GetPort()
logger.Printf("listening to %s", port)

h := handler(
	authn.Middleware(authenticator),
	NewReqIDMiddleware(),
	NewCORSMiddleware(),
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
