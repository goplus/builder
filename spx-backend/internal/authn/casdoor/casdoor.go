package casdoor

import (
	"context"
	"errors"
	"fmt"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

// client defines the interface for Casdoor client operations.
type client interface {
	ParseJwtToken(token string) (*casdoorsdk.Claims, error)
	GetUser(name string) (*casdoorsdk.User, error)
}

// authenticator implements [authn.Authenticator] using Casdoor.
type authenticator struct {
	client client
	db     *gorm.DB
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
		client: client,
		db:     db,
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
		Avatar:      claims.Avatar,
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
	if mUser.Avatar != casdoorUser.Avatar {
		mUserUpdates["avatar"] = casdoorUser.Avatar
	}
	if len(mUserUpdates) > 0 {
		if err := a.db.WithContext(ctx).Model(&mUser).Updates(mUserUpdates).Error; err != nil {
			return nil, fmt.Errorf("failed to update user %q: %w", mUser.Username, err)
		}
	}

	return mUser, nil
}
