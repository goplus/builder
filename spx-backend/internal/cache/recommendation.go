package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/goplus/builder/spx-backend/internal/log"
)

// RecommendationCache stores recommendation results for feedback tracking
type RecommendationCache struct {
	QueryID         string
	Query           string
	RecommendedPics []int64
	Timestamp       time.Time
}

// Cache defines the interface for caching recommendation results
type Cache interface {
	// SetRecommendation stores recommendation result in cache
	SetRecommendation(ctx context.Context, queryID, query string, recommendedPics []int64) error

	// GetRecommendation retrieves recommendation from cache
	GetRecommendation(ctx context.Context, queryID string) (*RecommendationCache, error)

	// MarkFeedbackSubmitted atomically marks that feedback has been submitted for a query
	// Returns true if successfully marked, false if already submitted
	MarkFeedbackSubmitted(ctx context.Context, queryID string, chosenPic int64) (bool, error)

	// GetFeedbackStatus checks if feedback has been submitted for a query
	// Returns (submitted, chosenPic, error)
	GetFeedbackStatus(ctx context.Context, queryID string) (bool, int64, error)

	// DeleteRecommendation removes a recommendation from cache
	DeleteRecommendation(ctx context.Context, queryID string) error
}

// RecommendationCacheService handles caching for image recommendations using Redis
// Implements the Cache interface with automatic fallback to memory cache
type RecommendationCacheService struct {
	redisClient *redis.Client
	memoryCache *MemoryCache // Fallback cache
	keyPrefix   string
	ttl         time.Duration
}

// NewRecommendationCacheService creates a new recommendation cache service
func NewRecommendationCacheService(redisClient *redis.Client) *RecommendationCacheService {
	return &RecommendationCacheService{
		redisClient: redisClient,
		memoryCache: NewMemoryCache(), // Always have a fallback ready
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

// SetRecommendation stores recommendation result in Redis, falls back to memory cache on Redis failure
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
		// Redis failed, fallback to memory cache
		logger.Printf("Redis failed for queryID %s, using memory cache: %v", queryID, err)
		return s.memoryCache.SetRecommendation(ctx, queryID, query, recommendedPics)
	}

	logger.Printf("Cached recommendation in Redis for queryID: %s", queryID)
	return nil
}

// GetRecommendation retrieves recommendation from Redis, falls back to memory cache on Redis failure
func (s *RecommendationCacheService) GetRecommendation(ctx context.Context, queryID string) (*RecommendationCache, error) {
	logger := log.GetReqLogger(ctx)

	key := s.CacheKey(queryID)
	jsonData, err := s.redisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		// Not found in Redis, try memory cache
		return s.memoryCache.GetRecommendation(ctx, queryID)
	} else if err != nil {
		// Redis failed, fallback to memory cache
		logger.Printf("Redis failed for queryID %s, using memory cache: %v", queryID, err)
		return s.memoryCache.GetRecommendation(ctx, queryID)
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

	// First try Redis
	ok, err := s.redisClient.SetNX(ctx, key, chosenPic, s.ttl).Result()
	if err != nil {
		// Redis failed, check if we already have this feedback in memory cache
		// to avoid duplicate submissions
		submitted, _, memErr := s.memoryCache.GetFeedbackStatus(ctx, queryID)
		if memErr == nil && submitted {
			logger.Printf("Feedback already exists in memory cache for queryID %s", queryID)
			return false, nil
		}

		// Redis failed and no existing feedback in memory, fallback to memory cache
		logger.Printf("Redis failed for queryID %s, using memory cache: %v", queryID, err)
		return s.memoryCache.MarkFeedbackSubmitted(ctx, queryID, chosenPic)
	}

	if !ok {
		// Key already exists in Redis, meaning feedback was already submitted
		existingChoice, _ := s.redisClient.Get(ctx, key).Int64()
		logger.Printf("Feedback already submitted for queryID %s (chosen: %d)", queryID, existingChoice)
		return false, nil
	}

	// Also store in memory cache for consistency when Redis succeeds
	_, _ = s.memoryCache.MarkFeedbackSubmitted(ctx, queryID, chosenPic)

	logger.Printf("Successfully marked feedback submitted in Redis for queryID %s, chosen pic: %d", queryID, chosenPic)
	return true, nil
}

// GetFeedbackStatus checks if feedback has been submitted for a query
func (s *RecommendationCacheService) GetFeedbackStatus(ctx context.Context, queryID string) (bool, int64, error) {
	logger := log.GetReqLogger(ctx)
	key := s.FeedbackKey(queryID)

	chosenPic, err := s.redisClient.Get(ctx, key).Int64()
	if err == redis.Nil {
		// Not found in Redis, try memory cache
		return s.memoryCache.GetFeedbackStatus(ctx, queryID)
	} else if err != nil {
		// Redis failed, fallback to memory cache
		logger.Printf("Redis failed for queryID %s, using memory cache: %v", queryID, err)
		return s.memoryCache.GetFeedbackStatus(ctx, queryID)
	}

	return true, chosenPic, nil
}

// DeleteRecommendation removes a recommendation from cache (for cleanup)
func (s *RecommendationCacheService) DeleteRecommendation(ctx context.Context, queryID string) error {
	logger := log.GetReqLogger(ctx)
	key := s.CacheKey(queryID)
	feedbackKey := s.FeedbackKey(queryID)

	// Delete both recommendation and feedback keys
	err := s.redisClient.Del(ctx, key, feedbackKey).Err()
	if err != nil {
		// Redis failed, fallback to memory cache
		logger.Printf("Redis failed for queryID %s, using memory cache: %v", queryID, err)
		return s.memoryCache.DeleteRecommendation(ctx, queryID)
	}

	return nil
}

// MemoryCache implements the Cache interface using in-memory storage
type MemoryCache struct {
	recommendations map[string]*RecommendationCache
	feedbacks       map[string]int64 // queryID -> chosenPic
	mutex           sync.RWMutex
	ttl             time.Duration
}

// NewMemoryCache creates a new memory cache instance
func NewMemoryCache() *MemoryCache {
	return &MemoryCache{
		recommendations: make(map[string]*RecommendationCache),
		feedbacks:       make(map[string]int64),
		ttl:             24 * time.Hour,
	}
}

// SetRecommendation stores recommendation result in memory cache
func (m *MemoryCache) SetRecommendation(ctx context.Context, queryID, query string, recommendedPics []int64) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.recommendations[queryID] = &RecommendationCache{
		QueryID:         queryID,
		Query:           query,
		RecommendedPics: recommendedPics,
		Timestamp:       time.Now(),
	}

	return nil
}

// GetRecommendation retrieves recommendation from memory cache
func (m *MemoryCache) GetRecommendation(ctx context.Context, queryID string) (*RecommendationCache, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	cached, exists := m.recommendations[queryID]
	if !exists {
		return nil, fmt.Errorf("recommendation not found")
	}

	// Check if cache has expired
	if time.Since(cached.Timestamp) > m.ttl {
		// Clean up expired entry
		delete(m.recommendations, queryID)
		return nil, fmt.Errorf("recommendation not found")
	}

	return cached, nil
}

// MarkFeedbackSubmitted atomically marks that feedback has been submitted for a query
func (m *MemoryCache) MarkFeedbackSubmitted(ctx context.Context, queryID string, chosenPic int64) (bool, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if feedback already exists
	if _, exists := m.feedbacks[queryID]; exists {
		return false, nil // Already submitted
	}

	// Mark as submitted
	m.feedbacks[queryID] = chosenPic
	return true, nil
}

// GetFeedbackStatus checks if feedback has been submitted for a query
func (m *MemoryCache) GetFeedbackStatus(ctx context.Context, queryID string) (bool, int64, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	chosenPic, exists := m.feedbacks[queryID]
	if !exists {
		return false, 0, nil
	}

	return true, chosenPic, nil
}

// DeleteRecommendation removes a recommendation from memory cache
func (m *MemoryCache) DeleteRecommendation(ctx context.Context, queryID string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.recommendations, queryID)
	delete(m.feedbacks, queryID)

	return nil
}