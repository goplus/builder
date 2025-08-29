# SVG Generation Service Usage

This document shows how to use the migrated SVG generation services in spx-backend.

## Quick Start

```go
package main

import (
    "context"
    "log"
    
    "github.com/goplus/builder/spx-backend/internal/config"
    "github.com/goplus/builder/spx-backend/internal/svggen"
    qlog "github.com/qiniu/x/log"
)

func main() {
    // Load configuration
    cfg, err := config.Load(qlog.Std)
    if err != nil {
        log.Fatal(err)
    }
    
    // Create service manager
    sm := svggen.NewServiceManager(cfg, qlog.Std)
    
    // Create generation request
    req := svggen.GenerateRequest{
        Prompt:   "A cute cartoon cat sitting on a cloud",
        Style:    "vector_illustration",
        Provider: svggen.ProviderSVGIO, // or ProviderRecraft, ProviderOpenAI
        Format:   "svg",
    }
    
    // Generate image
    ctx := context.Background()
    response, err := sm.GenerateImage(ctx, req)
    if err != nil {
        log.Fatal(err)
    }
    
    // Use the response
    fmt.Printf("Generated SVG ID: %s\n", response.ID)
    fmt.Printf("SVG URL: %s\n", response.SVGURL)
    fmt.Printf("PNG URL: %s\n", response.PNGURL)
}
```

## Configuration

The SVG generation services use the configuration from the main spx-backend config system. Make sure to set up the following environment variables:

### SVGIO Provider
```bash
SVGIO_ENABLED=true
SVGIO_BASE_URL=https://api.svg.io
SVGIO_GENERATE_ENDPOINT=/v1/generate-image
SVGIO_TIMEOUT=60s
SVGIO_MAX_RETRIES=3
```

### Recraft Provider
```bash
RECRAFT_ENABLED=true
RECRAFT_BASE_URL=https://external.api.recraft.ai
RECRAFT_GENERATE_ENDPOINT=/v1/images/generations
RECRAFT_VECTORIZE_ENDPOINT=/v1/images/vectorize
RECRAFT_DEFAULT_MODEL=recraftv3
RECRAFT_SUPPORTED_MODELS=recraftv3,recraftv2
RECRAFT_TIMEOUT=60s
RECRAFT_MAX_RETRIES=3
```

### OpenAI Provider (SVG Generation)
```bash
SVG_OPENAI_ENABLED=true
SVG_OPENAI_BASE_URL=https://api.qnaigc.com/v1/
SVG_OPENAI_DEFAULT_MODEL=claude-4.0-sonnet
SVG_OPENAI_MAX_TOKENS=4000
SVG_OPENAI_TEMPERATURE=0.7
SVG_OPENAI_TIMEOUT=60s
SVG_OPENAI_MAX_RETRIES=3
```

## API Integration

To integrate this into the spx-backend HTTP API, you can create a new controller:

```go
// In internal/controller/svg.go
package controller

import (
    "net/http"
    
    "github.com/goplus/builder/spx-backend/internal/svggen"
    "github.com/gin-gonic/gin"
)

func (ctrl *Controller) GenerateSVG(c *gin.Context) {
    var req svggen.GenerateRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    response, err := ctrl.svgManager.GenerateImage(c.Request.Context(), req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, response)
}
```

## Provider Features

### SVGIO
- Direct SVG generation
- Built-in PNG export
- Style customization
- Negative prompt support

### Recraft  
- High-quality image generation
- Automatic vectorization for SVG
- Multiple model support (recraftv3, recraftv2)
- Style and substyle options

### OpenAI
- AI-powered SVG code generation  
- Highly customizable prompts
- Compatible with OpenAI API format
- Supports various models (GPT-4, Claude, etc.)

## Error Handling

All services implement proper error handling and logging. Errors are returned with descriptive messages and logged with appropriate context.

```go
response, err := sm.GenerateImage(ctx, req)
if err != nil {
    // Handle specific errors
    switch {
    case strings.Contains(err.Error(), "provider not configured"):
        // Provider is disabled or not set up
    case strings.Contains(err.Error(), "http request"):
        // Network or API errors
    default:
        // Other errors
    }
}
```