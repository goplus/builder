import (
	"context"
	"errors"
	"os"
	"strconv"

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

ctrl, err = controller.New(context.Background())
if err != nil {
	logger.Fatalln("Failed to create a new controller:", err)
}

port := os.Getenv("PORT")
if port == "" {
	port = ":8080"
}
logger.Printf("Listening to %s", port)

run port, NewUserMiddleware(ctrl), NewReqIDMiddleware(), NewCORSMiddleware()
