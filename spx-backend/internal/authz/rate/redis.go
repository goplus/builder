package rate

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/redis/go-redis/v9"
)

// redisRateLimiter implements [authz.RateLimiter] using Redis storage.
type redisRateLimiter struct {
	client redis.Cmdable
}

// NewRedisRateLimiter creates a new Redis-based rate limiter.
func NewRedisRateLimiter(cfg config.RedisConfig) authz.RateLimiter {
	var client redis.Cmdable
	if cfg.IsClusterMode() {
		client = redis.NewClusterClient(&redis.ClusterOptions{
			Addrs:    cfg.GetAddr(),
			Password: cfg.Password,
			PoolSize: cfg.GetPoolSize(),
		})
	} else {
		client = redis.NewClient(&redis.Options{
			Addr:     cfg.GetAddr()[0],
			Password: cfg.Password,
			DB:       cfg.DB,
			PoolSize: cfg.GetPoolSize(),
		})
	}
	return &redisRateLimiter{client: client}
}

// Allow implements [authz.RateLimiter].
func (l *redisRateLimiter) Allow(ctx context.Context, userID int64, resource authz.Resource, policy authz.RatePolicy) (bool, time.Duration, error) {
	if policy.Limit <= 0 || policy.Window <= 0 {
		return true, 0, nil
	}

	key := fmt.Sprintf("rate:%d:%s", userID, resource)
	now := time.Now()
	windowStart := now.Truncate(policy.Window)
	window := fmt.Sprintf("%d", now.UnixNano()/int64(policy.Window))
	redisKey := fmt.Sprintf("%s:%s", key, window)

	ttl := policy.Window + time.Second

	pipe := l.client.TxPipeline()
	count := pipe.Incr(ctx, redisKey)
	pipe.Expire(ctx, redisKey, ttl)
	if _, err := pipe.Exec(ctx); err != nil {
		return false, 0, fmt.Errorf("failed to update rate limiter in Redis: %w", err)
	}
	currentCount, err := count.Result()
	if err != nil {
		return false, 0, fmt.Errorf("failed to retrieve rate limiter count: %w", err)
	}

	if currentCount > policy.Limit {
		nextWindow := windowStart.Add(policy.Window)
		freshNow := time.Now()
		retryAfter := max(nextWindow.Sub(freshNow), 0)
		return false, retryAfter, nil
	}
	return true, 0, nil
}

// Close implements [io.Closer].
func (l *redisRateLimiter) Close() error {
	if c, ok := l.client.(io.Closer); ok {
		return c.Close()
	}
	return nil
}
