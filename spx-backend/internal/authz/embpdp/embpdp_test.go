package embpdp

import (
	"context"
	"fmt"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockQuotaTracker struct {
	usage map[string]int64
}

func newMockQuotaTracker() *mockQuotaTracker {
	return &mockQuotaTracker{usage: make(map[string]int64)}
}

func (m *mockQuotaTracker) Usage(ctx context.Context, userID int64, resource authz.Resource) (int64, error) {
	key := fmt.Sprintf("%d:%s", userID, resource)
	return m.usage[key], nil
}

func (m *mockQuotaTracker) IncrementUsage(ctx context.Context, userID int64, resource authz.Resource, amount int64) error {
	key := fmt.Sprintf("%d:%s", userID, resource)
	m.usage[key] += amount
	return nil
}

func (m *mockQuotaTracker) ResetUsage(ctx context.Context, userID int64, resource authz.Resource) error {
	key := fmt.Sprintf("%d:%s", userID, resource)
	m.usage[key] = 0
	return nil
}

func TestNew(t *testing.T) {
	quotaTracker := newMockQuotaTracker()
	pdp := New(quotaTracker)

	require.NotNil(t, pdp)
}

func TestEmbeddedPDPComputeUserCapabilities(t *testing.T) {
	t.Run("Basic", func(t *testing.T) {
		for _, tt := range []struct {
			name                    string
			mUser                   *model.User
			wantCanManageAssets     bool
			wantCanUsePremiumLLM    bool
			wantCopilotMessageQuota int64
		}{
			{
				name: "AssetAdminWithPlusPlan",
				mUser: &model.User{
					Model:    model.Model{ID: 1},
					Username: "admin-user",
					Roles:    model.UserRoles{"assetAdmin"},
					Plan:     model.UserPlanPlus,
				},
				wantCanManageAssets:     true,
				wantCanUsePremiumLLM:    true,
				wantCopilotMessageQuota: 1000,
			},
			{
				name: "RegularPlusUser",
				mUser: &model.User{
					Model:    model.Model{ID: 2},
					Username: "plus-user",
					Roles:    nil,
					Plan:     model.UserPlanPlus,
				},
				wantCanManageAssets:     false,
				wantCanUsePremiumLLM:    true,
				wantCopilotMessageQuota: 1000,
			},
			{
				name: "RegularFreeUser",
				mUser: &model.User{
					Model:    model.Model{ID: 3},
					Username: "free-user",
					Roles:    nil,
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:     false,
				wantCanUsePremiumLLM:    false,
				wantCopilotMessageQuota: 100,
			},
			{
				name: "AdminWithFreePlan",
				mUser: &model.User{
					Model:    model.Model{ID: 4},
					Username: "admin-free-user",
					Roles:    model.UserRoles{"admin"},
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:     false,
				wantCanUsePremiumLLM:    false,
				wantCopilotMessageQuota: 100,
			},
			{
				name: "UserWithMultipleRoles",
				mUser: &model.User{
					Model:    model.Model{ID: 5},
					Username: "multi-role-user",
					Roles:    model.UserRoles{"user", "assetAdmin"},
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:     true,
				wantCanUsePremiumLLM:    false,
				wantCopilotMessageQuota: 100,
			},
		} {
			t.Run(tt.name, func(t *testing.T) {
				quotaTracker := newMockQuotaTracker()
				pdp := New(quotaTracker)

				caps, err := pdp.ComputeUserCapabilities(context.Background(), tt.mUser)
				require.NoError(t, err)
				assert.Equal(t, tt.wantCanManageAssets, caps.CanManageAssets)
				assert.Equal(t, tt.wantCanUsePremiumLLM, caps.CanUsePremiumLLM)
				assert.Equal(t, tt.wantCopilotMessageQuota, caps.CopilotMessageQuota)
				assert.Equal(t, caps.CopilotMessageQuota, caps.CopilotMessageQuotaLeft)
			})
		}
	})

	t.Run("WithQuotaUsage", func(t *testing.T) {
		quotaTracker := newMockQuotaTracker()
		pdp := New(quotaTracker)

		mUser := &model.User{
			Model:    model.Model{ID: 1},
			Username: "test-user",
			Roles:    nil,
			Plan:     model.UserPlanFree,
		}

		err := quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceCopilotMessage, 30)
		require.NoError(t, err)

		caps, err := pdp.ComputeUserCapabilities(context.Background(), mUser)
		require.NoError(t, err)
		assert.Equal(t, false, caps.CanManageAssets)
		assert.Equal(t, false, caps.CanUsePremiumLLM)
		assert.Equal(t, int64(100), caps.CopilotMessageQuota)
		assert.Equal(t, int64(70), caps.CopilotMessageQuotaLeft)
	})

	t.Run("QuotaExhausted", func(t *testing.T) {
		quotaTracker := newMockQuotaTracker()
		pdp := New(quotaTracker)

		mUser := &model.User{
			Model:    model.Model{ID: 1},
			Username: "test-user",
			Roles:    nil,
			Plan:     model.UserPlanFree,
		}

		err := quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceCopilotMessage, 150)
		require.NoError(t, err)

		caps, err := pdp.ComputeUserCapabilities(context.Background(), mUser)
		require.NoError(t, err)
		assert.Equal(t, int64(100), caps.CopilotMessageQuota)
		assert.Equal(t, int64(0), caps.CopilotMessageQuotaLeft)
	})
}
