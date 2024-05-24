package model

import "errors"

var (
	ErrExist    = errors.New("item already existed")
	ErrNotExist = errors.New("item does not exist")
)

// IsPublic indicates the visibility of an item.
type IsPublic int

const (
	Personal IsPublic = iota
	Public
)

// Status indicates the status of an item.
type Status int

const (
	StatusDeleted Status = iota
	StatusNormal
)
