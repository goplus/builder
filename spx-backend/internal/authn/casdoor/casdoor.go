package casdoor

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

var (
	insecureAvatarDomains = []string{
		"http://thirdqq.qlogo.cn",
	}
)

// client defines the interface for Casdoor client operations.
type client interface {
	ParseJwtToken(token string) (*casdoorsdk.Claims, error)
	GetUser(name string) (*casdoorsdk.User, error)
}

// authenticator implements [authn.Authenticator] using Casdoor.
type authenticator struct {
	client  client
	orgName string
	db      *gorm.DB
}

// New creates a new Casdoor authenticator.
func New(db *gorm.DB, cfg config.CasdoorConfig) authn.Authenticator {
	client := casdoorsdk.NewClientWithConf(&casdoorsdk.AuthConfig{
		Endpoint:         cfg.Endpoint,
		ClientId:         cfg.ClientID,
		ClientSecret:     cfg.ClientSecret,
		Certificate:      cfg.Certificate,
		OrganizationName: cfg.OrganizationName,
		ApplicationName:  cfg.ApplicationName,
	})
	return &authenticator{
		client:  client,
		orgName: cfg.OrganizationName,
		db:      db,
	}
}

// Authenticate implements [authn.Authenticator].
func (a *authenticator) Authenticate(ctx context.Context, token string) (*model.User, error) {
	claims, err := a.client.ParseJwtToken(token)
	if err != nil {
		return nil, errors.Join(authn.ErrUnauthorized, fmt.Errorf("failed to parse token: %w", err))
	}
	mUser, err := model.FirstOrCreateUser(ctx, a.db, model.CreateUserAttrs{
		Username:    claims.Name,
		DisplayName: claims.DisplayName,
		// TODO(wyvern): https://github.com/goplus/builder/issues/2159
		//  The avatar URL for the three-party oauth authorization may be http,
		//  which will cause the browser to not be able to obtain the avatar.
		//  Currently, it is temporarily replaced with https. A better way is to
		//  download it to our kodo and then obtain it from kodo. Kodo defaults to https.
		Avatar: fixAvatar(claims.Avatar),
		Roles:  nil,
		Plan:   model.UserPlanFree,
	})
	if err != nil {
		return nil, err
	}

	// Sync user info from Casdoor.
	casdoorUser, err := a.client.GetUser(mUser.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to get user %q from casdoor: %w", mUser.Username, err)
	}
	mUserUpdates := map[string]any{}
	if mUser.DisplayName != casdoorUser.DisplayName {
		mUserUpdates["display_name"] = casdoorUser.DisplayName
	}
	fixedAvatar := fixAvatar(casdoorUser.Avatar)
	if mUser.Avatar != fixedAvatar {
		mUserUpdates["avatar"] = fixedAvatar
	}
	if roles := a.extractUserRolesFromGroups(casdoorUser.Groups); !slices.Equal(mUser.Roles, roles) {
		mUserUpdates["roles"] = roles
	}
	if plan := a.extractUserPlanFromGroups(casdoorUser.Groups); mUser.Plan != plan {
		mUserUpdates["plan"] = plan
	}
	if len(mUserUpdates) > 0 {
		if err := a.db.WithContext(ctx).Model(&mUser).Updates(mUserUpdates).Error; err != nil {
			return nil, fmt.Errorf("failed to update user %q: %w", mUser.Username, err)
		}
	}

	return mUser, nil
}

// extractUserRolesFromGroups extracts user roles from Casdoor user groups. Expected
// format: "GoPlus/role:assetAdmin" for single role or multiple groups containing
// "GoPlus/role:" prefix.
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

// extractUserPlanFromGroups extracts user plan from Casdoor user groups. Expected
// format: "GoPlus/plan:free" or "GoPlus/plan:plus".
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

// fixAvatar fixes the avatar URL by replacing http with https.
func fixAvatar(avatar string) string {
	for _, domain := range insecureAvatarDomains {
		if strings.HasPrefix(avatar, domain) {
			return strings.Replace(avatar, "http://", "https://", 1)
		}
	}
	return avatar
}
