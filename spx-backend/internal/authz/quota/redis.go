package quota

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/redis/go-redis/v9"
)

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
func (t *redisQuotaTracker) Usage(ctx context.Context, userID int64, resource authz.Resource) (authz.QuotaUsage, error) {
	key := quotaKey(userID, resource)

	var (
		usageCmd *redis.StringCmd
		ttlCmd   *redis.DurationCmd
	)
	if _, err := t.client.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		usageCmd = pipe.Get(ctx, key)
		ttlCmd = pipe.PTTL(ctx, key)
		return nil
	}); err != nil && !errors.Is(err, redis.Nil) {
		return authz.QuotaUsage{}, fmt.Errorf("failed to fetch usage from Redis: %w", err)
	}

	var usage authz.QuotaUsage

	if used, err := usageCmd.Int64(); err != nil {
		if !errors.Is(err, redis.Nil) {
			return authz.QuotaUsage{}, fmt.Errorf("failed to get usage from Redis: %w", err)
		}
	} else if used > 0 {
		usage.Used = used
	}

	if ttl, err := ttlCmd.Result(); err != nil {
		if !errors.Is(err, redis.Nil) {
			return authz.QuotaUsage{}, fmt.Errorf("failed to get TTL from Redis: %w", err)
		}
	} else if ttl > 0 {
		usage.ResetTime = time.Now().Add(ttl)
	}

	return usage, nil
}

// IncrementUsage implements [authz.QuotaTracker].
func (t *redisQuotaTracker) IncrementUsage(ctx context.Context, userID int64, resource authz.Resource, amount int64, policy authz.QuotaPolicy) error {
	key := quotaKey(userID, resource)

	// Use pipeline to atomically increment and set TTL.
	pipe := t.client.Pipeline()
	pipe.IncrBy(ctx, key, amount)
	pipe.ExpireNX(ctx, key, policy.Window)

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("failed to increment usage in Redis: %w", err)
	}
	return nil
}

// ResetUsage implements [authz.QuotaTracker].
func (t *redisQuotaTracker) ResetUsage(ctx context.Context, userID int64, resource authz.Resource) error {
	key := quotaKey(userID, resource)

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

// quotaKey returns the Redis key for quota tracking.
func quotaKey(userID int64, resource authz.Resource) string {
	return fmt.Sprintf("%d:%s", userID, resource)
}
