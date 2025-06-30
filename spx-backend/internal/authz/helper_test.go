package authz

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUserCanManageAssets(t *testing.T) {
	t.Run("HasPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:         true,
			CanUsePremiumLLM:        false,
			CopilotMessageQuota:     100,
			CopilotMessageQuotaLeft: 50,
		})

		result := UserCanManageAssets(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:         false,
			CanUsePremiumLLM:        true,
			CopilotMessageQuota:     100,
			CopilotMessageQuotaLeft: 50,
		})

		result := UserCanManageAssets(ctx)
		assert.False(t, result)
	})

	t.Run("NoCapabilities", func(t *testing.T) {
		ctx := context.Background()

		result := UserCanManageAssets(ctx)
		assert.False(t, result)
	})

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userCapabilitiesContextKey{}, "not-capabilities")

		result := UserCanManageAssets(ctx)
		assert.False(t, result)
	})

	t.Run("ZeroCapabilities", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{})

		result := UserCanManageAssets(ctx)
		assert.False(t, result)
	})
}

func TestUserCanUsePremiumLLM(t *testing.T) {
	t.Run("HasPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:         false,
			CanUsePremiumLLM:        true,
			CopilotMessageQuota:     1000,
			CopilotMessageQuotaLeft: 800,
		})

		result := UserCanUsePremiumLLM(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:         true,
			CanUsePremiumLLM:        false,
			CopilotMessageQuota:     100,
			CopilotMessageQuotaLeft: 30,
		})

		result := UserCanUsePremiumLLM(ctx)
		assert.False(t, result)
	})

	t.Run("NoCapabilities", func(t *testing.T) {
		ctx := context.Background()

		result := UserCanUsePremiumLLM(ctx)
		assert.False(t, result)
	})

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userCapabilitiesContextKey{}, "not-capabilities")

		result := UserCanUsePremiumLLM(ctx)
		assert.False(t, result)
	})

	t.Run("ZeroCapabilities", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{})

		result := UserCanUsePremiumLLM(ctx)
		assert.False(t, result)
	})
}
