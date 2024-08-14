package controller

import (
	"context"
	"net"
	"net/http"
	"net/url"

	"github.com/goplus/builder/spx-backend/internal/log"
)

type MattingParams struct {
	// ImageUrl is the image URL to be matted.
	ImageUrl string `json:"imageUrl"`
}

type GenerateParams struct {
	// Category is the category of the image to be generated.
	Category string `json:"category"`
	// Keyword is the keyword of the image to be generated.
	Keyword string `json:"keyword"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
}

type GetGenerateParams struct {
	Category string `json:"category"`
	Prompt   string `json:"prompt"`
}

type GenerateResult struct {
	ImageUrl string `json:"image_url"`
}

type GenerateSpriteParams struct {
	// ImageUrl is the image URL to be generated as sprite.
	ImageUrl string `json:"imageUrl"`
}

type GetGenerateSpriteParams struct {
	ImageUrl string `json:"image_url"`
}

type GenerateSpriteResult struct {
	SpriteUrl string `json:"material_url"`
}

type GetEmbeddingParams struct {
	Prompt      string `json:"prompt"`
	CallbackUrl string `json:"callback_url"`
}

type GetEmbeddingResult struct {
	Embedding []float32 `json:"embedding"`
	Desc      string    `json:"desc"`
}

func (p *MattingParams) Validate() (ok bool, msg string) {
	if p.ImageUrl == "" {
		return false, "missing imageUrl"
	}

	// It may introduce security risk if we allow arbitrary image URL.
	// Urls targeting local or private network should be rejected.

	url, err := url.Parse(p.ImageUrl)
	if err != nil || url.Host == "" {
		return false, "invalid imageUrl"
	}
	if url.Scheme != "http" && url.Scheme != "https" {
		return false, "invalid imageUrl: unsupported scheme"
	}

	hostname := url.Hostname()
	ips, err := net.LookupIP(hostname)
	if err != nil {
		return false, "invalid imageUrl: lookup IP failed"
	}

	for _, ip := range ips {
		if isIPPrivate(ip) {
			return false, "invalid imageUrl: private IP"
		}
	}

	return true, ""
}

func isIPPrivate(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsPrivate() {
		return true
	}
	return false
}

type MattingResult struct {
	// ImageUrl is the image URL that has been matted.
	ImageUrl string `json:"imageUrl"`
}

// Matting removes background of given image.
func (ctrl *Controller) Matting(ctx context.Context, params *MattingParams) (*MattingResult, error) {
	logger := log.GetReqLogger(ctx)
	aigcParams := struct {
		ImageUrl string `json:"image_url"`
	}{
		ImageUrl: params.ImageUrl,
	}
	var aigcResult struct {
		ImageUrl string `json:"image_url"`
	}
	err := ctrl.aigcClient.Call(ctx, http.MethodPost, "/matting", &aigcParams, &aigcResult)
	if err != nil {
		logger.Printf("failed to call: %v", err)
		return nil, err
	}
	return &MattingResult{
		ImageUrl: aigcResult.ImageUrl,
	}, nil
}

// Generating follow parameters to generating images.
func (ctrl *Controller) Generating(ctx context.Context, param *GenerateParams) (*GenerateResult, error) {
	logger := log.GetReqLogger(ctx)
	var generateResult GenerateResult
	err := ctrl.aigcClient.Call(ctx, http.MethodPost, "/generate", &GetGenerateParams{
		Category: param.Category,
		Prompt:   param.Keyword, // todo: more parameters
	}, &generateResult)
	if err != nil {
		logger.Printf("failed to call: %v", err)
		return nil, err
	}
	return &generateResult, nil
}

// GenerateSprite follow parameters to generating sprite.
func (ctrl *Controller) GenerateSprite(ctx context.Context, param *GenerateSpriteParams) (*GenerateSpriteResult, error) {
	logger := log.GetReqLogger(ctx)
	var generateSpriteResult GenerateSpriteResult
	err := ctrl.aigcClient.Call(ctx, http.MethodPost, "/animate", &GetGenerateSpriteParams{
		ImageUrl: param.ImageUrl,
	}, &generateSpriteResult)
	if err != nil {
		logger.Printf("failed to call: %v", err)
		return nil, err
	}
	return &generateSpriteResult, nil
}

// GetEmbedding get text embedding.
func (ctrl *Controller) GetEmbedding(ctx context.Context, param *GetEmbeddingParams) (*GetEmbeddingResult, error) {
	logger := log.GetReqLogger(ctx)
	var embeddingResult GetEmbeddingResult
	err := ctrl.aigcClient.Call(ctx, http.MethodPost, "/embedding", &param, &embeddingResult)
	if err != nil {
		logger.Printf("failed to call: %v", err)
		return nil, err
	}
	return &embeddingResult, nil
}
