package util

import "strings"

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
