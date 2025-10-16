package casdoor

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	"gorm.io/gorm"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/avatar"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// client defines the interface for Casdoor client operations.
type client interface {
	ParseJwtToken(token string) (*casdoorsdk.Claims, error)
	GetUser(name string) (*casdoorsdk.User, error)
}

// authenticator implements [authn.Authenticator] using Casdoor.
type authenticator struct {
	client        client
	orgName       string
	db            *gorm.DB
	avatarManager avatar.Manager
}

// New creates a new Casdoor authenticator.
func New(db *gorm.DB, cfg config.CasdoorConfig, avatarManager avatar.Manager) (authn.Authenticator, error) {
	if avatarManager == nil {
		return nil, errors.New("missing avatar manager")
	}
	client := casdoorsdk.NewClientWithConf(&casdoorsdk.AuthConfig{
		Endpoint:         cfg.Endpoint,
		ClientId:         cfg.ClientID,
		ClientSecret:     cfg.ClientSecret,
		Certificate:      cfg.Certificate,
		OrganizationName: cfg.OrganizationName,
		ApplicationName:  cfg.ApplicationName,
	})
	return &authenticator{
		client:        client,
		orgName:       cfg.OrganizationName,
		db:            db,
		avatarManager: avatarManager,
	}, nil
}

// Authenticate implements [authn.Authenticator].
func (a *authenticator) Authenticate(ctx context.Context, token string) (*model.User, error) {
	claims, err := a.client.ParseJwtToken(token)
	if err != nil {
		return nil, errors.Join(authn.ErrUnauthorized, fmt.Errorf("failed to parse token: %w", err))
	}

	// Get latest user info from Casdoor.
	casdoorUser, err := a.client.GetUser(claims.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to get user %q from casdoor: %w", claims.Name, err)
	}

	var mUser model.User
	if err = a.db.WithContext(ctx).Where("username = ?", casdoorUser.Name).First(&mUser).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// First time user, create new one.
			return a.createUser(ctx, casdoorUser)
		}
		return nil, fmt.Errorf("failed to get user %q: %w", casdoorUser.Name, err)
	}

	// Existing user, sync info.
	return a.syncUser(ctx, &mUser, casdoorUser)
}

// createUser creates a new user with info from Casdoor.
func (a *authenticator) createUser(ctx context.Context, casdoorUser *casdoorsdk.User) (*model.User, error) {
	avatarURL, err := a.prepareAvatar(ctx, []byte(casdoorUser.Name), casdoorUser.Avatar)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare avatar: %w", err)
	}

	mUser, err := model.FirstOrCreateUser(ctx, a.db, model.CreateUserAttrs{
		Username:    casdoorUser.Name,
		DisplayName: casdoorUser.DisplayName,
		Avatar:      avatarURL,
		Roles:       a.extractUserRolesFromGroups(casdoorUser.Groups),
		Plan:        a.extractUserPlanFromGroups(casdoorUser.Groups),
	})
	if err != nil {
		return nil, err
	}
	return mUser, nil
}

// syncUser syncs info from Casdoor for an existing user.
func (a *authenticator) syncUser(ctx context.Context, mUser *model.User, casdoorUser *casdoorsdk.User) (*model.User, error) {
	mUserUpdates := map[string]any{}

	// Migrate legacy user avatars from third-party platforms.
	if !isKodoURL(mUser.Avatar) {
		candidateURL := strings.TrimSpace(casdoorUser.Avatar)
		if candidateURL == "" {
			candidateURL = mUser.Avatar
		}
		if candidateURL != "" {
			avatarURL, err := a.prepareAvatar(ctx, []byte(mUser.Username), candidateURL)
			if err != nil {
				logger := log.GetReqLogger(ctx)
				logger.Printf("failed to migrate avatar for user %q: %v", mUser.Username, err)
			} else if avatarURL != "" && avatarURL != mUser.Avatar {
				mUserUpdates["avatar"] = avatarURL
				mUser.Avatar = avatarURL
			}
		}
	}

	// Sync roles for authorization.
	roles := a.extractUserRolesFromGroups(casdoorUser.Groups)
	if !slices.Equal(mUser.Roles, roles) {
		mUserUpdates["roles"] = roles
	}

	// Sync plan for authorization.
	plan := a.extractUserPlanFromGroups(casdoorUser.Groups)
	if mUser.Plan != plan {
		mUserUpdates["plan"] = plan
	}

	if len(mUserUpdates) > 0 {
		if err := a.db.WithContext(ctx).Model(mUser).Updates(mUserUpdates).Error; err != nil {
			return nil, fmt.Errorf("failed to update user %q: %w", mUser.Username, err)
		}
	}
	return mUser, nil
}

// prepareAvatar ensures the avatar URL points to Kodo by uploading when needed.
func (a *authenticator) prepareAvatar(ctx context.Context, seed []byte, sourceURL string) (string, error) {
	sourceURL = strings.TrimSpace(sourceURL)
	if isKodoURL(sourceURL) {
		return sourceURL, nil
	}
	if sourceURL != "" {
		return a.avatarManager.UploadFromURL(ctx, sourceURL)
	}
	return a.avatarManager.UploadDefault(ctx, seed)
}

// extractUserRolesFromGroups extracts user roles from Casdoor user groups.
// Expected format: "GoPlus/role:assetAdmin" for single role or multiple groups
// containing "GoPlus/role:" prefix.
func (a *authenticator) extractUserRolesFromGroups(groups []string) model.UserRoles {
	rolePrefix := fmt.Sprintf("%s/role:", a.orgName)

	if len(groups) == 0 {
		return nil
	}

	var roles model.UserRoles
	for _, group := range groups {
		if role, ok := strings.CutPrefix(group, rolePrefix); ok && role != "" {
			roles = append(roles, role)
		}
	}
	return roles
}

// extractUserPlanFromGroups extracts user plan from Casdoor user groups.
// Expected format: "GoPlus/plan:free" or "GoPlus/plan:plus".
func (a *authenticator) extractUserPlanFromGroups(groups []string) model.UserPlan {
	planPrefix := fmt.Sprintf("%s/plan:", a.orgName)

	if len(groups) == 0 {
		return model.UserPlanFree
	}

	for _, group := range groups {
		if plan, ok := strings.CutPrefix(group, planPrefix); ok && plan != "" {
			up, err := model.ParseUserPlan(plan)
			if err != nil {
				return model.UserPlanFree
			}
			return up
		}
	}
	return model.UserPlanFree
}

// isKodoURL reports whether the avatar already uses the kodo:// scheme.
func isKodoURL(avatar string) bool {
	avatar = strings.TrimSpace(strings.ToLower(avatar))
	return strings.HasPrefix(avatar, "kodo://")
}
