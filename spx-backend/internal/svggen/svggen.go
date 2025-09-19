package svggen

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
	qlog "github.com/qiniu/x/log"
)

// Provider interface defines the contract for image generation providers.
type ProviderService interface {
	GenerateImage(ctx context.Context, req GenerateRequest) (*ImageResponse, error)
	BeautifyImage(ctx context.Context, req BeautifyImageRequest) (*BeautifyImageResponse, error)
}

// ServiceManager manages multiple upstream services.
type ServiceManager struct {
	svgioService     ProviderService
	recraftService   ProviderService
	openaiService    ProviderService
	translateService TranslateService
	httpClient       *http.Client
	logger           *qlog.Logger
	config           *config.Config
}

// NewServiceManager creates a new service manager.
func NewServiceManager(cfg *config.Config, logger *qlog.Logger) *ServiceManager {
	httpClient := &http.Client{
		Timeout: 60 * time.Second,
	}

	sm := &ServiceManager{
		httpClient: httpClient,
		logger:     logger,
		config:     cfg,
	}

	// Initialize providers based on configuration
	if cfg.Providers.SVGIO.Enabled {
		sm.svgioService = NewSVGIOService(cfg, httpClient, logger)
	}

	if cfg.Providers.Recraft.Enabled {
		sm.recraftService = NewRecraftService(cfg, httpClient, logger)
	}

	// Note: OpenAI service initialization needs copilot instance
	// It will be set later via SetCopilot method

	return sm
}

// SetCopilot sets the copilot instance and initializes OpenAI services.
func (sm *ServiceManager) SetCopilot(copilot *copilot.Copilot) {
	if sm.config.OpenAI.APIKey != "" {
		sm.openaiService = NewOpenAIService(sm.config, copilot, sm.logger)
		// Initialize translation service using the same copilot instance
		sm.translateService = NewCopilotTranslateService(copilot)
	}
}

// RegisterProvider registers a new provider.
func (sm *ServiceManager) RegisterProvider(providerType Provider, provider ProviderService) {
	switch providerType {
	case ProviderSVGIO:
		sm.svgioService = provider
	case ProviderRecraft:
		sm.recraftService = provider
	case ProviderOpenAI:
		sm.openaiService = provider
	}
}

// GetProvider gets the specified provider.
func (sm *ServiceManager) GetProvider(providerType Provider) ProviderService {
	switch providerType {
	case ProviderSVGIO:
		return sm.svgioService
	case ProviderRecraft:
		return sm.recraftService
	case ProviderOpenAI:
		return sm.openaiService
	default:
		return sm.svgioService // Default to SVGIO
	}
}

// GenerateImage generates an image using the specified provider.
func (sm *ServiceManager) GenerateImage(ctx context.Context, req GenerateRequest) (*ImageResponse, error) {
	logger := log.GetReqLogger(ctx)
	

	provider := sm.GetProvider(req.Provider)
	if provider == nil {
		logger.Printf("provider not configured: %s", string(req.Provider))
		return nil, errors.New("provider not configured: " + string(req.Provider))
	}

	// Handle translation for providers that need it
	originalPrompt := req.Prompt
	translatedPrompt := req.Prompt
	wasTranslated := false

	// Only translate for SVGIO provider (Recraft and OpenAI support Chinese natively)
	if !req.SkipTranslate && sm.translateService != nil && req.Provider == ProviderSVGIO {
		translated, err := sm.translateService.Translate(ctx, req.Prompt)
		if err != nil {
			logger.Printf("translation failed: %v", err)
			// Continue with original prompt if translation fails
		} else if translated != req.Prompt {
			translatedPrompt = translated
			wasTranslated = true
			req.Prompt = translatedPrompt
			logger.Printf("prompt translated: %q -> %q", originalPrompt, translatedPrompt)
		}
	}

	logger.Printf("generating image with provider: %s", string(req.Provider))
	resp, err := provider.GenerateImage(ctx, req)
	if err != nil {
		return nil, err
	}

	// Add translation information to response
	if wasTranslated {
		resp.OriginalPrompt = originalPrompt
		resp.TranslatedPrompt = translatedPrompt
		resp.WasTranslated = wasTranslated
	}

	return resp, nil
}

// BeautifyImage beautifies an image using the specified provider.
func (sm *ServiceManager) BeautifyImage(ctx context.Context, req BeautifyImageRequest) (*BeautifyImageResponse, error) {
	logger := log.GetReqLogger(ctx)
	start := time.Now()
	defer func() {
		logger.Printf("[PERF] SVG BeautifyImage (%s) took %v", req.Provider, time.Since(start))
	}()

	// Default to Recraft provider if not specified (since it's the only one that supports beautification)
	if req.Provider == "" {
		req.Provider = ProviderRecraft
	}

	provider := sm.GetProvider(req.Provider)
	if provider == nil {
		logger.Printf("provider not configured: %s", string(req.Provider))
		return nil, errors.New("provider not configured: " + string(req.Provider))
	}

	logger.Printf("beautifying image with provider: %s", string(req.Provider))
	providerStart := time.Now()
	resp, err := provider.BeautifyImage(ctx, req)
	logger.Printf("[PERF] Provider %s beautification took %v", req.Provider, time.Since(providerStart))
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// IsProviderEnabled checks if a provider is enabled.
func (sm *ServiceManager) IsProviderEnabled(provider Provider) bool {
	switch provider {
	case ProviderSVGIO:
		return sm.svgioService != nil
	case ProviderRecraft:
		return sm.recraftService != nil
	case ProviderOpenAI:
		return sm.openaiService != nil
	default:
		return false
	}
}


