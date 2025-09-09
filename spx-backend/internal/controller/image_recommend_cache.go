package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/goplus/builder/spx-backend/internal/log"
)

// RecommendationCacheService handles caching for image recommendations using Redis
type RecommendationCacheService struct {
	redisClient *redis.Client
	keyPrefix   string
	ttl         time.Duration
}

// NewRecommendationCacheService creates a new recommendation cache service
func NewRecommendationCacheService(redisClient *redis.Client) *RecommendationCacheService {
	return &RecommendationCacheService{
		redisClient: redisClient,
		keyPrefix:   "img_rec:",
		ttl:         24 * time.Hour,
	}
}

// CacheKey generates the Redis key for a query ID
func (s *RecommendationCacheService) CacheKey(queryID string) string {
	return fmt.Sprintf("%s%s", s.keyPrefix, queryID)
}

// FeedbackKey generates the Redis key for feedback tracking
func (s *RecommendationCacheService) FeedbackKey(queryID string) string {
	return fmt.Sprintf("%sfeedback:%s", s.keyPrefix, queryID)
}

// SetRecommendation stores recommendation result in Redis
func (s *RecommendationCacheService) SetRecommendation(ctx context.Context, queryID, query string, recommendedPics []int64) error {
	logger := log.GetReqLogger(ctx)
	
	data := &RecommendationCache{
		QueryID:         queryID,
		Query:           query,
		RecommendedPics: recommendedPics,
		Timestamp:       time.Now(),
	}
	
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal recommendation data: %w", err)
	}
	
	key := s.CacheKey(queryID)
	err = s.redisClient.Set(ctx, key, jsonData, s.ttl).Err()
	if err != nil {
		logger.Printf("Failed to set recommendation cache for queryID %s: %v", queryID, err)
		return fmt.Errorf("failed to set cache: %w", err)
	}
	
	logger.Printf("Cached recommendation for queryID: %s", queryID)
	return nil
}

// GetRecommendation retrieves recommendation from Redis
func (s *RecommendationCacheService) GetRecommendation(ctx context.Context, queryID string) (*RecommendationCache, error) {
	logger := log.GetReqLogger(ctx)
	
	key := s.CacheKey(queryID)
	jsonData, err := s.redisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		logger.Printf("Cache miss for queryID: %s", queryID)
		return nil, fmt.Errorf("recommendation not found")
	} else if err != nil {
		logger.Printf("Failed to get recommendation cache for queryID %s: %v", queryID, err)
		return nil, fmt.Errorf("failed to get cache: %w", err)
	}
	
	var data RecommendationCache
	err = json.Unmarshal([]byte(jsonData), &data)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal recommendation data: %w", err)
	}
	
	return &data, nil
}

// MarkFeedbackSubmitted atomically marks that feedback has been submitted for a query
// This ensures idempotency - only the first feedback submission will succeed
func (s *RecommendationCacheService) MarkFeedbackSubmitted(ctx context.Context, queryID string, chosenPic int64) (bool, error) {
	logger := log.GetReqLogger(ctx)
	
	key := s.FeedbackKey(queryID)
	
	// Use SET NX (set if not exists) to ensure only first submission succeeds
	// Store the chosen pic ID as the value
	ok, err := s.redisClient.SetNX(ctx, key, chosenPic, s.ttl).Result()
	if err != nil {
		logger.Printf("Failed to mark feedback submitted for queryID %s: %v", queryID, err)
		return false, fmt.Errorf("failed to mark feedback: %w", err)
	}
	
	if !ok {
		// Key already exists, meaning feedback was already submitted
		existingChoice, _ := s.redisClient.Get(ctx, key).Int64()
		logger.Printf("Feedback already submitted for queryID %s (chosen: %d)", queryID, existingChoice)
		return false, nil
	}
	
	logger.Printf("Successfully marked feedback submitted for queryID %s, chosen pic: %d", queryID, chosenPic)
	return true, nil
}

// GetFeedbackStatus checks if feedback has been submitted for a query
func (s *RecommendationCacheService) GetFeedbackStatus(ctx context.Context, queryID string) (bool, int64, error) {
	key := s.FeedbackKey(queryID)
	
	chosenPic, err := s.redisClient.Get(ctx, key).Int64()
	if err == redis.Nil {
		return false, 0, nil
	} else if err != nil {
		return false, 0, fmt.Errorf("failed to get feedback status: %w", err)
	}
	
	return true, chosenPic, nil
}

// DeleteRecommendation removes a recommendation from cache (for cleanup)
func (s *RecommendationCacheService) DeleteRecommendation(ctx context.Context, queryID string) error {
	key := s.CacheKey(queryID)
	feedbackKey := s.FeedbackKey(queryID)
	
	// Delete both recommendation and feedback keys
	err := s.redisClient.Del(ctx, key, feedbackKey).Err()
	if err != nil {
		return fmt.Errorf("failed to delete cache: %w", err)
	}
	
	return nil
}