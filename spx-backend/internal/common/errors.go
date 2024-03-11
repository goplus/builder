package common

import "errors"

var (
	ErrPermissions     = errors.New("not Permissions")
	ErrProjectNotExist = errors.New("no project")
)
