package controller

import (
	"context"
	"time"
)

// HealthResult is the result of the health check.
type HealthResult struct {
	Status string `json:"status"`
	Time   string `json:"time"`
}

// Health performs a health check.
func (ctrl *Controller) Health(ctx context.Context) (*HealthResult, error) {
	return &HealthResult{
		Status: "ok",
		Time:   time.Now().Format(time.RFC3339),
	}, nil
}
