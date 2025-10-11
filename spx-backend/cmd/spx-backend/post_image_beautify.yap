// Beautify an uploaded PNG image using AI.
//
// Request:
//   POST /image/beautify

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

// Get PNG file from form
file, _, err := ctx.Request.FormFile("image")
if err != nil {
	replyWithCodeMsg(ctx, errorInvalidArgs, "PNG file is required")
	return
}
defer file.Close()

// Read PNG data
imageData, err := io.ReadAll(file)
if err != nil {
	replyWithCodeMsg(ctx, errorInvalidArgs, "Failed to read PNG data")
	return
}

// Parse other form parameters
params := &controller.BeautifyImageParams{
	Prompt:         ctx.Request.FormValue("prompt"),
	Strength:       0.5, // Default value
	Style:          ctx.Request.FormValue("style"),
	SubStyle:       ctx.Request.FormValue("sub_style"),
	NegativePrompt: ctx.Request.FormValue("negative_prompt"),
	Provider:       svggen.ProviderRecraft, // Default to recraft
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

// Validate parameters
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

// Beautify image
result, err := ctrl.BeautifyImage(ctx.Context(), params, imageData)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
