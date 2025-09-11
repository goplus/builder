package svggen

import "time"

// Provider defines different image generation providers.
type Provider string

const (
	ProviderSVGIO   Provider = "svgio"
	ProviderRecraft Provider = "recraft"
	ProviderOpenAI  Provider = "openai"
)

// GenerateRequest represents a request to generate an SVG image.
type GenerateRequest struct {
	Prompt         string   `json:"prompt"`
	NegativePrompt string   `json:"negative_prompt,omitempty"`
	Style          string   `json:"style,omitempty"`
	Theme          string   `json:"theme,omitempty"`
	Provider       Provider `json:"provider,omitempty"`
	Format         string   `json:"format,omitempty"`
	SkipTranslate  bool     `json:"skip_translate,omitempty"`

	// Recraft specific parameters
	Model     string `json:"model,omitempty"`
	Size      string `json:"size,omitempty"`
	Substyle  string `json:"substyle,omitempty"`
	NumImages int    `json:"n,omitempty"`
}

// ImageResponse represents the response from image generation.
type ImageResponse struct {
	ID             string    `json:"id"`
	Prompt         string    `json:"prompt"`
	NegativePrompt string    `json:"negative_prompt"`
	Style          string    `json:"style"`
	SVGURL         string    `json:"svg_url"`
	PNGURL         string    `json:"png_url"`
	Width          int       `json:"width"`
	Height         int       `json:"height"`
	CreatedAt      time.Time `json:"created_at"`
	Provider       Provider  `json:"provider"`

	// Translation related information
	OriginalPrompt   string `json:"original_prompt,omitempty"`
	TranslatedPrompt string `json:"translated_prompt,omitempty"`
	WasTranslated    bool   `json:"was_translated"`
}

// SVG.IO upstream API related types
type SVGIOGenerateReq struct {
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negativePrompt"`
	Style          string `json:"style,omitempty"`
}

type SVGIOGenerateItem struct {
	ID                  string `json:"id"`
	Description         string `json:"description"`
	Height              int    `json:"height"`
	HasInitialImage     bool   `json:"hasInitialImage"`
	IsPrivate           bool   `json:"isPrivate"`
	NSFWTextDetected    bool   `json:"nsfwTextDetected"`
	NSFWContentDetected bool   `json:"nsfwContentDetected"`
	PNGURL              string `json:"pngUrl"`
	SVGURL              string `json:"svgUrl"`
	Style               string `json:"style"`
	Prompt              string `json:"prompt"`
	NegativePrompt      string `json:"negativePrompt"`
	Width               int    `json:"width"`
	UpdatedAt           string `json:"updatedAt"`
	CreatedAt           string `json:"createdAt"`
}

type SVGIOGenerateResp struct {
	Success bool                `json:"success"`
	Data    []SVGIOGenerateItem `json:"data"`
}

// Recraft API related types
type RecraftGenerateReq struct {
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negative_prompt,omitempty"`
	Style          string `json:"style,omitempty"`
	Substyle       string `json:"substyle,omitempty"`
	Model          string `json:"model,omitempty"`
	Size           string `json:"size,omitempty"`
	N              int    `json:"n,omitempty"`
	ResponseFormat string `json:"response_format,omitempty"`
}

type RecraftImageData struct {
	URL           string `json:"url"`
	B64JSON       string `json:"b64_json,omitempty"`
	RevisedPrompt string `json:"revised_prompt,omitempty"`
}

type RecraftGenerateResp struct {
	Created int                `json:"created"`
	Data    []RecraftImageData `json:"data"`
}

type RecraftVectorizeReq struct {
	ResponseFormat string `json:"response_format,omitempty"`
}

type RecraftVectorizeResp struct {
	Image RecraftImageData `json:"image"`
}

