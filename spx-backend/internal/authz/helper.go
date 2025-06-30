package authz

import "context"

// UserCanManageAssets checks if the user can manage assets.
func UserCanManageAssets(ctx context.Context) bool {
	caps, ok := UserCapabilitiesFromContext(ctx)
	return ok && caps.CanManageAssets
}

// UserCanUsePremiumLLM checks if the user can use premium LLM models.
func UserCanUsePremiumLLM(ctx context.Context) bool {
	caps, ok := UserCapabilitiesFromContext(ctx)
	return ok && caps.CanUsePremiumLLM
}
