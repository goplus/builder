package quota

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/redis/go-redis/v9"
)

// quotaTTL is the TTL for quota keys in Redis.
const quotaTTL = 24 * time.Hour

// redisQuotaTracker implements [authz.QuotaTracker] using Redis storage.
type redisQuotaTracker struct {
	client redis.Cmdable
}

// NewRedisQuotaTracker creates a new Redis-based quota tracker.
func NewRedisQuotaTracker(cfg config.RedisConfig) authz.QuotaTracker {
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
	return &redisQuotaTracker{client: client}
}

// Usage implements [authz.QuotaTracker].
func (t *redisQuotaTracker) Usage(ctx context.Context, userID int64, resource authz.Resource) (int64, error) {
	key := fmt.Sprintf("%d:%s", userID, resource)

	usage, err := t.client.Get(ctx, key).Int64()
	if err != nil {
		if err == redis.Nil {
			// Key doesn't exist, return 0.
			return 0, nil
		}
		return 0, fmt.Errorf("failed to get usage from Redis: %w", err)
	}
	return usage, nil
}

// IncrementUsage implements [authz.QuotaTracker].
func (t *redisQuotaTracker) IncrementUsage(ctx context.Context, userID int64, resource authz.Resource, amount int64) error {
	key := fmt.Sprintf("%d:%s", userID, resource)

	// Use pipeline to atomically increment and set TTL.
	pipe := t.client.Pipeline()
	pipe.IncrBy(ctx, key, amount)
	pipe.Expire(ctx, key, quotaTTL)

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("failed to increment usage in Redis: %w", err)
	}
	return nil
}

// ResetUsage implements [authz.QuotaTracker].
func (t *redisQuotaTracker) ResetUsage(ctx context.Context, userID int64, resource authz.Resource) error {
	key := fmt.Sprintf("%d:%s", userID, resource)

	if _, err := t.client.Del(ctx, key).Result(); err != nil {
		return fmt.Errorf("failed to reset usage in Redis: %w", err)
	}
	return nil
}

// Close closes the Redis connection.
func (t *redisQuotaTracker) Close() error {
	if c, ok := t.client.(io.Closer); ok {
		return c.Close()
	}
	return nil
}
