package common

import "errors"

var (
	ErrPermissions     = errors.New("not Permissions")
	ErrProjectNotExist = errors.New("no project")
	ErrBLOBUSInvalid   = errors.New("BLOBUS is invalid")
	ErrMarshal         = errors.New("marshal error")
	ErrUnmarshal       = errors.New("unmarshal error")
)
