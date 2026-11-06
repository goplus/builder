package xgoexec

// Framework supplies the build-time class-framework registration for a caller
// selected XGo framework. Framework implementations deliberately live outside
// this module.
type Framework interface {
	Register() error
}
