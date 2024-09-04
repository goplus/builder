package controller

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

type GetRateResponse struct {
	Rate   float64                    `json:"rate"`
	Detail []model.RatingDistribution `json:"detail"`
}

type PostRateRequest struct {
	Rate int `json:"rate"`
}

// GetRate gets the rate of an asset.
func (ctrl *Controller) GetRate(ctx context.Context, assetId string) (*GetRateResponse, error) {
	logger := log.GetReqLogger(ctx)
	rates, err := model.GetRatingDistribution(ctx, ctrl.ormDb, assetId)
	avgRate := model.CalculateAverageScore(rates)
	if err != nil {
		logger.Printf("failed to get rate: %v", err)
		return nil, err
	}
	return &GetRateResponse{
		Rate:   avgRate,
		Detail: rates,
	}, nil
}

// InsertRate inserts a rate.
func (ctrl *Controller) InsertRate(ctx context.Context, assetId string, owner string, param *PostRateRequest) (float64, error) {
	logger := log.GetReqLogger(ctx)
	scoreInt := param.Rate
	if scoreInt < 1 || scoreInt > 5 {
		logger.Printf("invalid rate: %d", scoreInt)
		return -1, nil
	}
	err := model.InsertRate(ctx, ctrl.ormDb, assetId, owner, scoreInt)
	if err != nil {
		logger.Printf("failed to insert rate: %v", err)
		return -1, err
	}
	rates, err := ctrl.GetRate(ctx, assetId)
	if err != nil {
		logger.Printf("failed to get rate: %v", err)
		return -1, err
	}
	return rates.Rate, nil
}
