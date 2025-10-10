package controller

import (
	"context"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/svggen"
)

func TestController_ChangeCharacterStyle_ValidationErrors(t *testing.T) {
	ctrl := &Controller{}

	ctx := context.Background()

	tests := []struct {
		name      string
		params    *ChangeCharacterStyleParams
		imageData []byte
		wantErr   string
	}{
		{
			name: "empty image data",
			params: &ChangeCharacterStyleParams{
				StylePrompt:      "change outfit",
				Strength:         0.5,
				Provider:         svggen.ProviderRecraft,
				PreserveIdentity: true,
			},
			imageData: []byte{},
			wantErr:   "image data is required",
		},
		{
			name: "oversized image data",
			params: &ChangeCharacterStyleParams{
				StylePrompt:      "change outfit",
				Strength:         0.5,
				Provider:         svggen.ProviderRecraft,
				PreserveIdentity: true,
			},
			imageData: make([]byte, 6*1024*1024), // 6MB, exceeds 5MB limit
			wantErr:   "image size exceeds 5MB limit",
		},
		{
			name: "invalid image format - not PNG",
			params: &ChangeCharacterStyleParams{
				StylePrompt:      "change outfit",
				Strength:         0.5,
				Provider:         svggen.ProviderRecraft,
				PreserveIdentity: true,
			},
			imageData: []byte{0xFF, 0xD8, 0xFF, 0xE0}, // JPEG signature
			wantErr:   "only PNG format is supported for character style change",
		},
		{
			name: "valid PNG but params validation fails",
			params: &ChangeCharacterStyleParams{
				StylePrompt: "hi", // Too short
				Strength:    0.5,
				Provider:    svggen.ProviderRecraft,
			},
			imageData: []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, // Valid PNG
			wantErr:   "style_prompt must be at least 3 characters",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validate params first if they should fail
			if tt.wantErr == "style_prompt must be at least 3 characters" {
				ok, msg := tt.params.Validate()
				if ok {
					t.Errorf("Expected params validation to fail")
					return
				}
				if msg != tt.wantErr {
					t.Errorf("Expected validation error %q, got %q", tt.wantErr, msg)
				}
				return
			}

			_, err := ctrl.ChangeCharacterStyle(ctx, tt.params, tt.imageData)
			if err == nil {
				t.Errorf("ChangeCharacterStyle() should return error, got nil")
				return
			}

			if err.Error() != tt.wantErr {
				t.Errorf("ChangeCharacterStyle() error = %q, want %q", err.Error(), tt.wantErr)
			}
		})
	}
}

// Note: Controller integration tests with full mocking would require dependency injection.
// The core business logic is already tested through:
// 1. Parameter validation tests (in svg_test.go)
// 2. Recraft service tests (in recraft_test.go)
// 3. Input validation tests (below)

// Test the PNG format validation helper function
func TestController_isPNGFormat_Additional(t *testing.T) {
	ctrl := &Controller{}

	tests := []struct {
		name     string
		data     []byte
		wantPNG  bool
	}{
		{
			name:    "valid PNG with extra data",
			data:    append([]byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, make([]byte, 100)...),
			wantPNG: true,
		},
		{
			name:    "partial PNG signature",
			data:    []byte{0x89, 0x50, 0x4E, 0x47}, // Only first 4 bytes
			wantPNG: false,
		},
		{
			name:    "corrupted PNG signature - wrong middle bytes",
			data:    []byte{0x89, 0x50, 0x4E, 0x48, 0x0D, 0x0A, 0x1A, 0x0A}, // 0x48 instead of 0x47
			wantPNG: false,
		},
		{
			name:    "GIF signature",
			data:    []byte{0x47, 0x49, 0x46, 0x38, 0x39, 0x61}, // GIF89a
			wantPNG: false,
		},
		{
			name:    "BMP signature",
			data:    []byte{0x42, 0x4D}, // BM
			wantPNG: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ctrl.isPNGFormat(tt.data)
			if got != tt.wantPNG {
				t.Errorf("isPNGFormat() = %v, want %v", got, tt.wantPNG)
			}
		})
	}
}

// Note: Tests for Kodo failure, Database failure, and Vector service failure scenarios
// would be implemented as integration tests with proper dependency injection.
// These scenarios are critical for production reliability but require more complex test setup.