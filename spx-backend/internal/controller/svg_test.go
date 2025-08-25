package controller

import (
	"testing"

	"github.com/goplus/builder/spx-backend/internal/svggen"
)

func TestGenerateSVGParams_Validate(t *testing.T) {
	tests := []struct {
		name     string
		params   GenerateSVGParams
		wantOK   bool
		wantMsg  string
	}{
		{
			name: "valid parameters",
			params: GenerateSVGParams{
				Prompt:   "A cute cat",
				Provider: svggen.ProviderSVGIO,
			},
			wantOK:  true,
			wantMsg: "",
		},
		{
			name: "prompt too short",
			params: GenerateSVGParams{
				Prompt: "hi",
			},
			wantOK:  false,
			wantMsg: "prompt must be at least 3 characters",
		},
		{
			name: "invalid provider",
			params: GenerateSVGParams{
				Prompt:   "A cute cat",
				Provider: "invalid",
			},
			wantOK:  false,
			wantMsg: "provider must be one of: svgio, recraft, openai",
		},
		{
			name: "default provider",
			params: GenerateSVGParams{
				Prompt: "A cute cat",
				// Provider not set - should default to SVGIO
			},
			wantOK:  true,
			wantMsg: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotOK, gotMsg := tt.params.Validate()
			if gotOK != tt.wantOK {
				t.Errorf("Validate() gotOK = %v, want %v", gotOK, tt.wantOK)
			}
			if gotMsg != tt.wantMsg {
				t.Errorf("Validate() gotMsg = %v, want %v", gotMsg, tt.wantMsg)
			}
			
			// Check that default provider is set when not specified
			if tt.params.Provider == "" && gotOK {
				if tt.params.Provider != svggen.ProviderSVGIO {
					t.Errorf("Default provider should be set to SVGIO, got %v", tt.params.Provider)
				}
			}
		})
	}
}

func TestGenerateImageParams_Validate(t *testing.T) {
	params := GenerateImageParams{
		GenerateSVGParams: GenerateSVGParams{
			Prompt:   "A beautiful landscape",
			Provider: svggen.ProviderRecraft,
		},
	}

	ok, msg := params.Validate()
	if !ok {
		t.Errorf("GenerateImageParams validation failed: %s", msg)
	}
}

func TestController_parseDataURL(t *testing.T) {
	ctrl := &Controller{}

	tests := []struct {
		name     string
		dataURL  string
		wantErr  bool
		wantData string
	}{
		{
			name:     "valid base64 data URL",
			dataURL:  "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", // <svg></svg>
			wantErr:  false,
			wantData: "<svg></svg>",
		},
		{
			name:     "valid plain data URL",
			dataURL:  "data:image/svg+xml,<svg></svg>",
			wantErr:  false,
			wantData: "<svg></svg>",
		},
		{
			name:    "invalid data URL - missing prefix",
			dataURL: "image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
			wantErr: true,
		},
		{
			name:    "invalid data URL - missing comma",
			dataURL: "data:image/svg+xml;base64PHN2Zz48L3N2Zz4=",
			wantErr: true,
		},
		{
			name:    "invalid base64",
			dataURL: "data:image/svg+xml;base64,invalid!!!",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ctrl.parseDataURL(tt.dataURL)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseDataURL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && string(got) != tt.wantData {
				t.Errorf("parseDataURL() = %v, want %v", string(got), tt.wantData)
			}
		})
	}
}