package util

import "strings"

// ToPtr returns a pointer to the value.
func ToPtr[T any](v T) *T {
	return &v
}

// FromPtr returns the value from a pointer. It returns the zero value of type T
// if the pointer is nil.
func FromPtr[T any](p *T) T {
	if p == nil {
		var zero T
		return zero
	}
	return *p
}

const (
	GoptPrefix = "Gopt_" // Go+ template method
	GopoPrefix = "Gopo_" // Go+ overload function/method
	GopxPrefix = "Gopx_" // Go+ type as parameters function/method
	GopPackage = "GopPackage"
)

// SplitGoptMethod splits a Go+ template method name into receiver type name and
// method name.
func SplitGoptMethod(name string) (recvTypeName string, methodName string, ok bool) {
	recvTypeName, methodName, ok = strings.Cut(name[len(GoptPrefix):], "_")
	if !ok {
		return "", "", false
	}
	methodName = strings.TrimPrefix(methodName, GopxPrefix)
	return
}
