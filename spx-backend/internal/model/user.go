package model

import (
	"context"
	"database/sql/driver"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// User is the model for users.
type User struct {
	Model

	// Username is the unique username.
	Username string `gorm:"column:username;index:,composite:username,unique"`

	// DisplayName is the display name.
	DisplayName string `gorm:"column:display_name"`

	// Avatar is the URL of the avatar image.
	Avatar string `gorm:"column:avatar"`

	// Description is the brief bio or description.
	Description string `gorm:"column:description"`

	// Roles is a comma-separated list of roles for authorization.
	Roles UserRoles `gorm:"column:roles"`

	// Plan is the subscription plan.
	Plan UserPlan `gorm:"column:plan"`

	// FollowerCount is the number of followers the user has.
	FollowerCount int64 `gorm:"column:follower_count"`

	// FollowingCount is the number of users the user is following.
	FollowingCount int64 `gorm:"column:following_count"`

	// ProjectCount is the total number of projects created by the user.
	ProjectCount int64 `gorm:"column:project_count"`

	// PublicProjectCount is the number of public projects created by the user.
	PublicProjectCount int64 `gorm:"column:public_project_count"`

	// LikedProjectCount is the number of projects liked by the user.
	LikedProjectCount int64 `gorm:"column:liked_project_count"`

	// Migration only fields. Do not use in application code.
	MO__deleted_at_is_null _deleted_at_is_null `gorm:"->:false;<-:false;column:_deleted_at_is_null;index:,composite:username,unique"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (User) TableName() string {
	return "user"
}

// UserRoles is a list of user roles.
type UserRoles []string

// String implements [fmt.Stringer].
func (ur UserRoles) String() string {
	return strings.Join(ur, ",")
}

// Scan implements [sql.Scanner].
func (ur *UserRoles) Scan(value any) error {
	switch v := value.(type) {
	case string:
		if v != "" {
			*ur = strings.Split(v, ",")
		} else {
			*ur = nil
		}
	case []byte:
		if len(v) > 0 {
			*ur = strings.Split(string(v), ",")
		} else {
			*ur = nil
		}
	case nil:
		*ur = nil
	default:
		return errors.New("incompatible type for UserRoles")
	}
	return nil
}

// Value implements [driver.Valuer].
func (ur UserRoles) Value() (driver.Value, error) {
	return ur.String(), nil
}

// UserPlan is the subscription plan of user.
type UserPlan uint8

const (
	UserPlanFree UserPlan = iota
	UserPlanPlus
)

// ParseUserPlan parses the string representation of a user plan.
func ParseUserPlan(s string) (UserPlan, error) {
	var up UserPlan
	return up, up.UnmarshalText([]byte(s))
}

// String implements [fmt.Stringer].
func (up UserPlan) String() string {
	if text, err := up.MarshalText(); err == nil {
		return string(text)
	}
	return fmt.Sprintf("UserPlan(%d)", up)
}

// MarshalText implements [encoding.TextMarshaler].
func (up UserPlan) MarshalText() ([]byte, error) {
	switch up {
	case UserPlanFree:
		return []byte("free"), nil
	case UserPlanPlus:
		return []byte("plus"), nil
	default:
		return nil, fmt.Errorf("invalid user plan: %d", up)
	}
}

// UnmarshalText implements [encoding.TextUnmarshaler].
func (up *UserPlan) UnmarshalText(text []byte) error {
	switch string(text) {
	case "free":
		*up = UserPlanFree
	case "plus":
		*up = UserPlanPlus
	default:
		return fmt.Errorf("invalid user plan: %s", text)
	}
	return nil
}

// CreateUserAttrs holds attributes for creating a user with [FirstOrCreateUser].
type CreateUserAttrs struct {
	Username    string
	DisplayName string
	Avatar      string
	Roles       UserRoles
	Plan        UserPlan
}

// FirstOrCreateUser gets or creates a user.
func FirstOrCreateUser(ctx context.Context, db *gorm.DB, attrs CreateUserAttrs) (*User, error) {
	var mUser User
	if err := db.WithContext(ctx).
		Where("username = ?", attrs.Username).
		Attrs(User{
			Username:    attrs.Username,
			DisplayName: attrs.DisplayName,
			Avatar:      attrs.Avatar,
			Roles:       attrs.Roles,
			Plan:        attrs.Plan,
		}).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "username"}},
			DoNothing: true,
		}).
		FirstOrCreate(&mUser).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get/create user %q: %w", attrs.Username, err)
	}
	if mUser.ID == 0 {
		// Unfortunately, MySQL doesn't support the RETURNING clause.
		if err := db.WithContext(ctx).
			Where("username = ?", attrs.Username).
			First(&mUser).
			Error; err != nil {
			return nil, fmt.Errorf("failed to get user %q: %w", attrs.Username, err)
		}
	}
	return &mUser, nil
}
