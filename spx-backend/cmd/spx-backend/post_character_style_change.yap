// Change character styling while preserving character identity.
//
// Request:
//   POST /character/style/change

import (
	"io"
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/svggen"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

// Parse multipart form data
err := ctx.Request.ParseMultipartForm(10 << 20) // 10MB max memory
if err != nil {
	replyWithCodeMsg(ctx, errorInvalidArgs, "Failed to parse multipart form")
	return
}

// Get image file from form
file, _, err := ctx.Request.FormFile("image")
if err != nil {
	replyWithCodeMsg(ctx, errorInvalidArgs, "Image file is required")
	return
}
defer file.Close()

// Read image data
imageData, err := io.ReadAll(file)
if err != nil {
	replyWithCodeMsg(ctx, errorInvalidArgs, "Failed to read image data")
	return
}

// Parse other form parameters
params := &controller.ChangeCharacterStyleParams{
	StylePrompt:      ctx.Request.FormValue("style_prompt"),
	Strength:         0.3, // Default value for character preservation
	Style:            ctx.Request.FormValue("style"),
	SubStyle:         ctx.Request.FormValue("sub_style"),
	NegativePrompt:   ctx.Request.FormValue("negative_prompt"),
	Provider:         svggen.ProviderRecraft, // Default to recraft
	PreserveIdentity: true,                   // Default to preserve identity
}

// Parse strength if provided
if strengthStr := ctx.Request.FormValue("strength"); strengthStr != "" {
	if strength, err := strconv.ParseFloat(strengthStr, 64); err == nil {
		params.Strength = strength
	}
}

// Parse provider if provided
if providerStr := ctx.Request.FormValue("provider"); providerStr != "" {
	params.Provider = svggen.Provider(providerStr)
}

// Parse preserve_identity if provided
if preserveStr := ctx.Request.FormValue("preserve_identity"); preserveStr != "" {
	if preserve, err := strconv.ParseBool(preserveStr); err == nil {
		params.PreserveIdentity = preserve
	}
}

// Validate parameters
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

// Change character style
result, err := ctrl.ChangeCharacterStyle(ctx.Context(), params, imageData)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result