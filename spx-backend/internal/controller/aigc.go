package controller

import (
	"context"
	"net/http"

	"github.com/goplus/builder/spx-backend/internal/log"
)

type MattingParams struct {
	// ImageUrl is the image URL to be matted.
	ImageUrl string `json:"imageUrl"`
}

func (p *MattingParams) Validate() (ok bool, msg string) {
	if p.ImageUrl == "" {
		return false, "missing imageUrl"
	}
	return true, ""
}

type MattingResult struct {
	// ImageUrl is the image URL that has been matted.
	ImageUrl string `json:"imageUrl"`
}

// Matting removes background of given image.
func (ctrl *Controller) Matting(ctx context.Context, params *MattingParams) (*MattingResult, error) {
	logger := log.GetReqLogger(ctx)
	aigcParams := struct {
		ImageUrl string `json:"image_url"`
	}{
		ImageUrl: params.ImageUrl,
	}
	var aigcResult struct {
		ImageUrl string `json:"image_url"`
	}
	err := ctrl.aigcClient.Call(ctx, http.MethodPost, "/matting", &aigcParams, &aigcResult)
	if err != nil {
		logger.Printf("failed to call: %v", err)
		return nil, err
	}
	return &MattingResult{
		ImageUrl: aigcResult.ImageUrl,
	}, nil
}
