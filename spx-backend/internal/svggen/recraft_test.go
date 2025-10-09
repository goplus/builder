package svggen

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/goplus/builder/spx-backend/internal/config"
	qlog "github.com/qiniu/x/log"
)

func TestRecraftService_buildCharacterPreservationPrompt(t *testing.T) {
	service := &RecraftService{}

	tests := []struct {
		name             string
		stylePrompt      string
		preserveIdentity bool
		wantContains     []string
		wantNotContains  []string
	}{
		{
			name:             "preserve identity enabled",
			stylePrompt:      "change to casual clothes",
			preserveIdentity: true,
			wantContains: []string{
				"保持角色的面部特征、体型和基本外观不变",
				"change to casual clothes",
				"确保角色身份完全保持不变",
			},
		},
		{
			name:             "preserve identity disabled",
			stylePrompt:      "change to medieval armor",
			preserveIdentity: false,
			wantContains: []string{
				"change to medieval armor",
			},
			wantNotContains: []string{
				"保持角色的面部特征",
				"确保角色身份完全保持不变",
			},
		},
		{
			name:             "complex style prompt with preserve identity",
			stylePrompt:      "穿上现代商务套装，手持公文包",
			preserveIdentity: true,
			wantContains: []string{
				"保持角色的面部特征、体型和基本外观不变",
				"穿上现代商务套装，手持公文包",
				"确保角色身份完全保持不变",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.buildCharacterPreservationPrompt(tt.stylePrompt, tt.preserveIdentity)

			for _, want := range tt.wantContains {
				if !strings.Contains(result, want) {
					t.Errorf("buildCharacterPreservationPrompt() result should contain %q, got %q", want, result)
				}
			}

			for _, notWant := range tt.wantNotContains {
				if strings.Contains(result, notWant) {
					t.Errorf("buildCharacterPreservationPrompt() result should not contain %q, got %q", notWant, result)
				}
			}
		})
	}
}

func TestRecraftService_buildCharacterPreservationNegativePrompt(t *testing.T) {
	service := &RecraftService{}

	tests := []struct {
		name           string
		negativePrompt string
		wantContains   []string
	}{
		{
			name:           "empty negative prompt",
			negativePrompt: "",
			wantContains: []string{
				"改变面部特征",
				"改变角色身份",
				"不同的人",
				"面部变形",
				"体型改变",
			},
		},
		{
			name:           "existing negative prompt",
			negativePrompt: "ugly, blurred",
			wantContains: []string{
				"ugly, blurred",
				"改变面部特征",
				"改变角色身份",
				"不同的人",
				"面部变形",
				"体型改变",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.buildCharacterPreservationNegativePrompt(tt.negativePrompt)

			for _, want := range tt.wantContains {
				if !strings.Contains(result, want) {
					t.Errorf("buildCharacterPreservationNegativePrompt() result should contain %q, got %q", want, result)
				}
			}
		})
	}
}

func TestRecraftService_ChangeCharacterStyle_ValidationErrors(t *testing.T) {
	service := &RecraftService{
		config: &config.RecraftConfig{
			BaseURL: "http://localhost",
			Endpoints: config.RecraftEndpoints{
				ImageToImage: "/test",
			},
			DefaultModel: "recraftv3",
		},
		httpClient: &http.Client{Timeout: 5 * time.Second},
		logger:     qlog.Std,
	}

	ctx := context.Background()

	tests := []struct {
		name    string
		req     CharacterStyleChangeRequest
		wantErr string
	}{
		{
			name: "empty image data",
			req: CharacterStyleChangeRequest{
				ImageData:        []byte{},
				StylePrompt:      "change outfit",
				Strength:         0.5,
				PreserveIdentity: true,
			},
			wantErr: "image data is required",
		},
		{
			name: "empty style prompt",
			req: CharacterStyleChangeRequest{
				ImageData:        []byte{0x89, 0x50, 0x4E, 0x47}, // Mock PNG data
				StylePrompt:      "",
				Strength:         0.5,
				PreserveIdentity: true,
			},
			wantErr: "style prompt is required",
		},
		{
			name: "strength too low",
			req: CharacterStyleChangeRequest{
				ImageData:        []byte{0x89, 0x50, 0x4E, 0x47},
				StylePrompt:      "change outfit",
				Strength:         -0.1,
				PreserveIdentity: true,
			},
			wantErr: "strength must be between 0 and 1",
		},
		{
			name: "strength too high",
			req: CharacterStyleChangeRequest{
				ImageData:        []byte{0x89, 0x50, 0x4E, 0x47},
				StylePrompt:      "change outfit",
				Strength:         1.1,
				PreserveIdentity: true,
			},
			wantErr: "strength must be between 0 and 1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := service.ChangeCharacterStyle(ctx, tt.req)
			if err == nil {
				t.Errorf("ChangeCharacterStyle() should return error, got nil")
				return
			}
			if !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("ChangeCharacterStyle() error = %v, want error containing %v", err, tt.wantErr)
			}
		})
	}
}

func TestRecraftService_ChangeCharacterStyle_Success(t *testing.T) {
	// Create a mock HTTP server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify the request method and path
		if r.Method != http.MethodPost {
			t.Errorf("Expected POST request, got %s", r.Method)
		}

		// Verify Content-Type is multipart/form-data
		contentType := r.Header.Get("Content-Type")
		if !strings.Contains(contentType, "multipart/form-data") {
			t.Errorf("Expected multipart/form-data, got %s", contentType)
		}

		// Verify Authorization header exists (token validation skipped in test)
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer") {
			t.Errorf("Expected Authorization header to start with Bearer, got %s", auth)
		}

		// Parse multipart form
		err := r.ParseMultipartForm(10 << 20)
		if err != nil {
			t.Errorf("Failed to parse multipart form: %v", err)
		}

		// Verify form fields
		expectedFields := map[string]string{
			"strength":        "0.40",
			"response_format": "url",
			"style":           "realistic_image",
			"n":               "1",
			"model":           "recraftv3",
		}

		for field, expectedValue := range expectedFields {
			if got := r.FormValue(field); got != expectedValue {
				t.Errorf("Expected %s=%s, got %s", field, expectedValue, got)
			}
		}

		// Verify prompt contains character preservation text
		prompt := r.FormValue("prompt")
		if !strings.Contains(prompt, "保持角色的面部特征") {
			t.Errorf("Expected prompt to contain character preservation text, got: %s", prompt)
		}

		// Verify negative prompt contains character preservation restrictions
		negativePrompt := r.FormValue("negative_prompt")
		if !strings.Contains(negativePrompt, "改变面部特征") {
			t.Errorf("Expected negative prompt to contain character preservation restrictions, got: %s", negativePrompt)
		}

		// Return mock response
		response := RecraftImageToImageResp{
			Created: int(time.Now().Unix()),
			Data: []RecraftImageData{
				{
					URL: "https://example.com/styled-character.png",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer mockServer.Close()

	// Create service with mock server
	service := &RecraftService{
		config: &config.RecraftConfig{
			BaseURL: mockServer.URL,
			Endpoints: config.RecraftEndpoints{
				ImageToImage: "/test",
			},
			DefaultModel: "recraftv3",
		},
		httpClient: &http.Client{Timeout: 5 * time.Second},
		logger:     qlog.Std,
	}

	// Test request
	req := CharacterStyleChangeRequest{
		ImageData:        []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, // Valid PNG signature
		StylePrompt:      "change to medieval knight armor",
		Strength:         0.4,
		Style:            "realistic_image",
		SubStyle:         "detailed",
		NegativePrompt:   "ugly, distorted",
		Provider:         ProviderRecraft,
		PreserveIdentity: true,
	}

	ctx := context.Background()
	result, err := service.ChangeCharacterStyle(ctx, req)

	if err != nil {
		t.Errorf("ChangeCharacterStyle() error = %v, want nil", err)
		return
	}

	// Verify response
	if result == nil {
		t.Errorf("ChangeCharacterStyle() result is nil")
		return
	}

	if result.URL != "https://example.com/styled-character.png" {
		t.Errorf("Expected URL=https://example.com/styled-character.png, got %s", result.URL)
	}

	if result.Provider != ProviderRecraft {
		t.Errorf("Expected Provider=recraft, got %s", result.Provider)
	}

	if result.Strength != 0.4 {
		t.Errorf("Expected Strength=0.4, got %f", result.Strength)
	}

	if !result.PreserveIdentity {
		t.Errorf("Expected PreserveIdentity=true, got %v", result.PreserveIdentity)
	}

	if result.ID == "" {
		t.Errorf("Expected non-empty ID, got empty string")
	}
}

func TestRecraftService_ChangeCharacterStyle_HTTPError(t *testing.T) {
	// Create a mock HTTP server that returns an error
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "Invalid request"}`))
	}))
	defer mockServer.Close()

	service := &RecraftService{
		config: &config.RecraftConfig{
			BaseURL: mockServer.URL,
			Endpoints: config.RecraftEndpoints{
				ImageToImage: "/test",
			},
			DefaultModel: "recraftv3",
		},
		httpClient: &http.Client{Timeout: 5 * time.Second},
		logger:     qlog.Std,
	}

	req := CharacterStyleChangeRequest{
		ImageData:        []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
		StylePrompt:      "change outfit",
		Strength:         0.5,
		PreserveIdentity: true,
	}

	ctx := context.Background()
	_, err := service.ChangeCharacterStyle(ctx, req)

	if err == nil {
		t.Errorf("ChangeCharacterStyle() should return error for HTTP 400, got nil")
	}

	if !strings.Contains(err.Error(), "recraft API error") {
		t.Errorf("Expected error to contain 'recraft API error', got %v", err)
	}
}

func TestRecraftService_ChangeCharacterStyle_EmptyResponse(t *testing.T) {
	// Create a mock HTTP server that returns empty data
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := RecraftImageToImageResp{
			Created: int(time.Now().Unix()),
			Data:    []RecraftImageData{}, // Empty data
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer mockServer.Close()

	service := &RecraftService{
		config: &config.RecraftConfig{
			BaseURL: mockServer.URL,
			Endpoints: config.RecraftEndpoints{
				ImageToImage: "/test",
			},
			DefaultModel: "recraftv3",
		},
		httpClient: &http.Client{Timeout: 5 * time.Second},
		logger:     qlog.Std,
	}

	req := CharacterStyleChangeRequest{
		ImageData:        []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
		StylePrompt:      "change outfit",
		Strength:         0.5,
		PreserveIdentity: true,
	}

	ctx := context.Background()
	_, err := service.ChangeCharacterStyle(ctx, req)

	if err == nil {
		t.Errorf("ChangeCharacterStyle() should return error for empty response, got nil")
	}

	if !strings.Contains(err.Error(), "no images generated") {
		t.Errorf("Expected error to contain 'no images generated', got %v", err)
	}
}

func TestRecraftService_ChangeCharacterStyle_NetworkError(t *testing.T) {
	// Skip this test for now as it requires complex HTTP client mocking
	t.Skip("Network error testing requires more complex setup")
}