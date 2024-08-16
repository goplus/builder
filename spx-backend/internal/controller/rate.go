package controller

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

type GetRateResponse struct {
	Rate   int                        `json:"rate"`
	Detail []model.RatingDistribution `json:"detail"`
}

type PostRateResponse struct {
	Rate int `json:"rate"`
}

// GetRate gets the rate of an asset.
func (ctrl *Controller) GetRate(ctx context.Context, assetId string, owner string) (*GetRateResponse, error) {
	logger := log.GetReqLogger(ctx)
	rates, err := model.GetRatingDistribution(ctx, ctrl.ormDb, assetId, owner)
	avgRate := model.CalculateAverageScore(rates)
	if err != nil {
		logger.Printf("failed to get rate: %v", err)
		return nil, err
	}
	return &GetRateResponse{
		Rate:   int(avgRate),
		Detail: rates,
	}, nil
}

// InsertRate inserts a rate.
func (ctrl *Controller) InsertRate(ctx context.Context, assetId string, owner string, score int) (*PostRateResponse, error) {
	logger := log.GetReqLogger(ctx)
	err := model.InsertRate(ctx, ctrl.ormDb, assetId, owner, score)
	if err != nil {
		logger.Printf("failed to insert rate: %v", err)
		return nil, err
	}
	rates, err := ctrl.GetRate(ctx, assetId, owner)
	if err != nil {
		logger.Printf("failed to get rate: %v", err)
		return nil, err
	}
	return &PostRateResponse{
		Rate: rates.Rate,
	}, nil
}