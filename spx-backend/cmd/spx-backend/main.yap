import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/log"
)

const (
	firstPageIndex  = 1
	defaultPageSize = 10
)

var (
	ctrl *controller.Controller
	err error
)

logger := log.GetLogger()

ctrl, err = controller.New(context.Background(),nil)
if err != nil {
	logger.Fatalln("Failed to create a new controller:", err)
}

port := os.Getenv("PORT")
if port == "" {
	port = ":8080"
}
logger.Printf("Listening to %s", port)

h := handler(NewUserMiddleware(ctrl), NewReqIDMiddleware(), NewCORSMiddleware())
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
	logger.Fatalln("Server error:", err)
}

shutdownCtx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()
if err := server.Shutdown(shutdownCtx); err != nil {
	logger.Fatalln("Failed to gracefully shut down:", err)
}
