package svggen

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/log"
	qlog "github.com/qiniu/x/log"
)

// Provider interface defines the contract for image generation providers.
type ProviderService interface {
	GenerateImage(ctx context.Context, req GenerateRequest) (*ImageResponse, error)
}

// ServiceManager manages multiple upstream services.
type ServiceManager struct {
	svgioService   ProviderService
	recraftService ProviderService
	openaiService  ProviderService
	httpClient     *http.Client
	logger         *qlog.Logger
}

// NewServiceManager creates a new service manager.
func NewServiceManager(cfg *config.Config, logger *qlog.Logger) *ServiceManager {
	httpClient := &http.Client{
		Timeout: 60 * time.Second,
	}

	sm := &ServiceManager{
		httpClient: httpClient,
		logger:     logger,
	}

	// Initialize providers based on configuration
	if cfg.Providers.SVGIO.Enabled {
		sm.svgioService = NewSVGIOService(cfg, httpClient, logger)
	}

	if cfg.Providers.Recraft.Enabled {
		sm.recraftService = NewRecraftService(cfg, httpClient, logger)
	}

	if cfg.Providers.SVGOpenAI.Enabled {
		sm.openaiService = NewOpenAIService(cfg, httpClient, logger)
	}

	return sm
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
	
	logger.Printf("generating image with provider: %s", string(req.Provider))
	return provider.GenerateImage(ctx, req)
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