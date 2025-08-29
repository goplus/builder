package svggen

import (
	"context"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/config"
	qlog "github.com/qiniu/x/log"
)

func TestServiceManager_NewServiceManager(t *testing.T) {
	cfg := &config.Config{
		Providers: config.ProvidersConfig{
			SVGIO: config.SVGIOConfig{
				Enabled: true,
				BaseURL: "https://api.svg.io",
				Endpoints: config.SVGIOEndpoints{
					Generate: "/v1/generate",
				},
			},
			Recraft: config.RecraftConfig{
				Enabled:      true,
				BaseURL:      "https://api.recraft.ai",
				DefaultModel: "recraftv3",
				Endpoints: config.RecraftEndpoints{
					Generate:  "/v1/images/generations",
					Vectorize: "/v1/images/vectorize",
				},
			},
			SVGOpenAI: config.OpenAISVGConfig{
				Enabled:      true,
				BaseURL:      "https://api.openai.com/v1",
				DefaultModel: "gpt-4",
				MaxTokens:    4000,
				Temperature:  0.7,
			},
		},
	}

	logger := qlog.Std
	sm := NewServiceManager(cfg, logger)

	if sm == nil {
		t.Fatal("ServiceManager should not be nil")
	}

	// Test provider availability
	if !sm.IsProviderEnabled(ProviderSVGIO) {
		t.Error("SVGIO provider should be enabled")
	}

	if !sm.IsProviderEnabled(ProviderRecraft) {
		t.Error("Recraft provider should be enabled")
	}

	if !sm.IsProviderEnabled(ProviderOpenAI) {
		t.Error("OpenAI provider should be enabled")
	}
}

func TestServiceManager_GenerateImage(t *testing.T) {
	cfg := &config.Config{
		Providers: config.ProvidersConfig{
			SVGIO: config.SVGIOConfig{
				Enabled: false, // Disabled for test
			},
		},
	}

	logger := qlog.Std
	sm := NewServiceManager(cfg, logger)

	req := GenerateRequest{
		Prompt:   "test prompt",
		Provider: ProviderSVGIO,
	}

	ctx := context.Background()
	_, err := sm.GenerateImage(ctx, req)

	// Should return error since provider is not configured
	if err == nil {
		t.Error("Should return error for unconfigured provider")
	}
}

func TestGenerateImageID(t *testing.T) {
	id1 := GenerateImageID(ProviderSVGIO)
	id2 := GenerateImageID(ProviderRecraft)

	if id1 == id2 {
		t.Error("Generated IDs should be different")
	}

	if id1 == "" || id2 == "" {
		t.Error("Generated IDs should not be empty")
	}
}

func TestParseSizeFromString(t *testing.T) {
	tests := []struct {
		input  string
		width  int
		height int
	}{
		{"512x512", 512, 512},
		{"1024x1024", 1024, 1024},
		{"", 1024, 1024},
		{"invalid", 1024, 1024},
	}

	for _, test := range tests {
		w, h := ParseSizeFromString(test.input)
		if w != test.width || h != test.height {
			t.Errorf("ParseSizeFromString(%s) = (%d, %d), want (%d, %d)",
				test.input, w, h, test.width, test.height)
		}
	}
}
