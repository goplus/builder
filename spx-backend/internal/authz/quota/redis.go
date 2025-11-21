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
func (t *redisQuotaTracker) Usage(ctx context.Context, userID int64, policy authz.QuotaPolicy) (authz.QuotaUsage, error) {
	key := quotaKey(userID, policy)

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

// ResetUsage implements [authz.QuotaTracker].
func (t *redisQuotaTracker) ResetUsage(ctx context.Context, userID int64, policy authz.QuotaPolicy) error {
	key := quotaKey(userID, policy)

	if _, err := t.client.Del(ctx, key).Result(); err != nil {
		return fmt.Errorf("failed to reset usage in Redis: %w", err)
	}
	return nil
}

// luaTryConsume performs an atomic check-and-increment across multiple quota
// keys. It returns {1} on success, or {0, failedIndex, used, ttl} on exhaustion
// at KEYS[failedIndex] without mutating state.
var luaTryConsume = redis.NewScript(`
local amount = tonumber(ARGV[1])
local n = tonumber(ARGV[2])

-- First pass: check limits without mutating state.
local argPos = 3
for i = 1, n do
    local limit = tonumber(ARGV[argPos])
    local window = tonumber(ARGV[argPos + 1])
    argPos = argPos + 2

    if limit <= 0 then
        return {0, i, 0, 0}
    end

    local used = tonumber(redis.call("GET", KEYS[i]) or "0")
    if used + amount > limit then
        local ttl = redis.call("PTTL", KEYS[i])
        if ttl < 0 then
            ttl = window
        end
        return {0, i, used, ttl}
    end
end

-- Second pass: apply increments and set TTL when absent.
argPos = 3
for i = 1, n do
    local limit = tonumber(ARGV[argPos])
    local window = tonumber(ARGV[argPos + 1])
    argPos = argPos + 2

    redis.call("INCRBY", KEYS[i], amount)
    if window > 0 then
        local ttl = redis.call("PTTL", KEYS[i])
        if ttl < 0 then
            redis.call("PEXPIRE", KEYS[i], window)
        end
    end
end

return {1}
`)

// TryConsume implements [authz.QuotaTracker].
func (t *redisQuotaTracker) TryConsume(ctx context.Context, userID int64, policies []authz.QuotaPolicy, amount int64) (*authz.Quota, error) {
	if len(policies) == 0 || amount <= 0 {
		return nil, nil
	}

	keys := make([]string, 0, len(policies))
	args := make([]any, 0, 2*len(policies)+2)
	args = append(args, amount, len(policies))
	for _, policy := range policies {
		keys = append(keys, quotaKey(userID, policy))
		args = append(args, policy.Limit, policy.Window.Milliseconds())
	}

	result, err := luaTryConsume.Run(ctx, t.client, keys, args...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to execute quota script: %w", err)
	}

	data, ok := result.([]any)
	if !ok || len(data) == 0 {
		return nil, fmt.Errorf("unexpected script return: %v", result)
	}

	success, _ := data[0].(int64)
	if success == 1 {
		return nil, nil
	} else if len(data) != 4 {
		return nil, fmt.Errorf("unexpected script return: %v", result)
	}
	failedIndex, _ := data[1].(int64)
	used, _ := data[2].(int64)
	ttl, _ := data[3].(int64)

	if failedIndex <= 0 || int(failedIndex) > len(policies) {
		return nil, fmt.Errorf("invalid failed index from script: %d", failedIndex)
	}
	policy := policies[failedIndex-1]

	var resetTime time.Time
	if ttl > 0 {
		resetTime = time.Now().Add(time.Duration(ttl) * time.Millisecond)
	}

	return &authz.Quota{
		QuotaPolicy: policy,
		QuotaUsage: authz.QuotaUsage{
			Used:      used,
			ResetTime: resetTime,
		},
	}, nil
}

// Close closes the Redis connection.
func (t *redisQuotaTracker) Close() error {
	if c, ok := t.client.(io.Closer); ok {
		return c.Close()
	}
	return nil
}

// quotaKey returns the Redis key for quota tracking.
func quotaKey(userID int64, policy authz.QuotaPolicy) string {
	name := policy.Name
	if name == "" {
		name = string(policy.Resource)
	}
	return fmt.Sprintf("%d:%s", userID, name)
}
