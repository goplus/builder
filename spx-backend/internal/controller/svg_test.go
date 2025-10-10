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

func TestChangeCharacterStyleParams_Validate(t *testing.T) {
	tests := []struct {
		name     string
		params   ChangeCharacterStyleParams
		wantOK   bool
		wantMsg  string
	}{
		{
			name: "valid parameters",
			params: ChangeCharacterStyleParams{
				StylePrompt:      "change to casual clothes",
				Strength:         0.3,
				Provider:         svggen.ProviderRecraft,
				PreserveIdentity: true,
			},
			wantOK:  true,
			wantMsg: "",
		},
		{
			name: "style_prompt too short",
			params: ChangeCharacterStyleParams{
				StylePrompt: "hi",
				Strength:    0.5,
			},
			wantOK:  false,
			wantMsg: "style_prompt must be at least 3 characters",
		},
		{
			name: "strength too low",
			params: ChangeCharacterStyleParams{
				StylePrompt: "change outfit",
				Strength:    -0.1,
			},
			wantOK:  false,
			wantMsg: "strength must be between 0 and 1",
		},
		{
			name: "strength too high",
			params: ChangeCharacterStyleParams{
				StylePrompt: "change outfit",
				Strength:    1.1,
			},
			wantOK:  false,
			wantMsg: "strength must be between 0 and 1",
		},
		{
			name: "invalid provider",
			params: ChangeCharacterStyleParams{
				StylePrompt: "change outfit",
				Strength:    0.5,
				Provider:    "invalid",
			},
			wantOK:  false,
			wantMsg: "only recraft provider supports character style change",
		},
		{
			name: "default provider should be recraft",
			params: ChangeCharacterStyleParams{
				StylePrompt: "change outfit",
				Strength:    0.5,
				// Provider not set - should default to Recraft
			},
			wantOK:  true,
			wantMsg: "",
		},
		{
			name: "default preserve identity should be true",
			params: ChangeCharacterStyleParams{
				StylePrompt: "change outfit",
				Strength:    0.5,
				Provider:    svggen.ProviderRecraft,
				// PreserveIdentity not set - should default to true
			},
			wantOK:  true,
			wantMsg: "",
		},
		{
			name: "svgio provider not supported",
			params: ChangeCharacterStyleParams{
				StylePrompt: "change outfit",
				Strength:    0.5,
				Provider:    svggen.ProviderSVGIO,
			},
			wantOK:  false,
			wantMsg: "only recraft provider supports character style change",
		},
		{
			name: "openai provider not supported",
			params: ChangeCharacterStyleParams{
				StylePrompt: "change outfit",
				Strength:    0.5,
				Provider:    svggen.ProviderOpenAI,
			},
			wantOK:  false,
			wantMsg: "only recraft provider supports character style change",
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
				if tt.params.Provider != svggen.ProviderRecraft {
					t.Errorf("Default provider should be set to Recraft, got %v", tt.params.Provider)
				}
			}

			// Check that default preserve identity is set when not specified
			if gotOK && !tt.params.PreserveIdentity {
				t.Errorf("Default PreserveIdentity should be true, got %v", tt.params.PreserveIdentity)
			}
		})
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

func TestController_isPNGFormat(t *testing.T) {
	ctrl := &Controller{}

	tests := []struct {
		name     string
		data     []byte
		wantPNG  bool
	}{
		{
			name:    "valid PNG signature",
			data:    []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02, 0x03},
			wantPNG: true,
		},
		{
			name:    "invalid signature - wrong first byte",
			data:    []byte{0x88, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
			wantPNG: false,
		},
		{
			name:    "invalid signature - JPEG",
			data:    []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46},
			wantPNG: false,
		},
		{
			name:    "too short data",
			data:    []byte{0x89, 0x50, 0x4E},
			wantPNG: false,
		},
		{
			name:    "empty data",
			data:    []byte{},
			wantPNG: false,
		},
		{
			name:    "random data",
			data:    []byte{0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08},
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