package controller

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// MockOpenAIClient creates a mock OpenAI client for testing
func createMockCopilot() *copilot.Copilot {
	// Create a test client that won't actually make API calls
	client := openai.NewClient(option.WithAPIKey("test-key"), option.WithBaseURL("http://localhost:8080"))
	premiumClient := openai.NewClient(option.WithAPIKey("test-premium-key"), option.WithBaseURL("http://localhost:8080"))

	cpt, _ := copilot.New(client, "gpt-3.5-turbo", premiumClient, "gpt-4")
	return cpt
}

// TestAssetCompletionLLM_Basic tests basic LLM completion functionality
func TestAssetCompletionLLM_Basic(t *testing.T) {
	// Skip this test if we're in CI or don't have API access
	if testing.Short() {
		t.Skip("Skipping LLM test in short mode")
	}

	// Create mock database
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	// Mock existing assets query
	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("cat").
		AddRow("camera").
		AddRow("car")

	mock.ExpectQuery("SELECT `name` FROM `game_assets`").
		WillReturnRows(rows)

	// Create mock copilot
	cpt := createMockCopilot()

	// Create LLM completion service
	llmService := NewAssetCompletionLLM(cpt, gormDB)

	// Test cache functionality
	stats := llmService.GetCacheStats()
	assert.Equal(t, "llm", stats["mode"])
	assert.Equal(t, 0, stats["cache_size"])

	// Test cache clear
	llmService.ClearCache()
	assert.NotNil(t, llmService)
}

// TestAssetCompletionService_LLMMode tests the service in LLM mode
func TestAssetCompletionService_LLMMode(t *testing.T) {
	// Skip this test if we're in CI or don't have API access
	if testing.Short() {
		t.Skip("Skipping LLM test in short mode")
	}

	// Create mock database
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	// Create mock copilot
	cpt := createMockCopilot()

	// Create service with LLM mode
	service := &AssetCompletionService{
		db:   gormDB,
		llm:  NewAssetCompletionLLM(cpt, gormDB),
		mode: CompletionModeLLM,
	}

	// Test cache stats
	stats := service.GetCacheStats()
	assert.Equal(t, "llm", stats["mode"])
	assert.True(t, stats["llm_enabled"].(bool))

	// Test refresh cache
	err = service.RefreshCache()
	assert.NoError(t, err)

	// Verify expectations
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

// TestAssetCompletionService_ModeFallback tests mode fallback functionality
func TestAssetCompletionService_ModeFallback(t *testing.T) {
	// Create mock database
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	// Test 1: LLM mode without copilot should fallback to trie
	trieRows := sqlmock.NewRows([]string{"name"}).
		AddRow("cat").
		AddRow("car")
	mock.ExpectQuery("SELECT `name` FROM `game_assets`").
		WillReturnRows(trieRows)

	service1 := &AssetCompletionService{
		db:   gormDB,
		trie: NewAssetCompletionTrie(gormDB),
		mode: CompletionModeLLM, // LLM mode but no LLM service
	}

	ctx := context.Background()
	results, err := service1.CompleteAssetName(ctx, "ca", 5)
	assert.NoError(t, err)
	assert.NotNil(t, results)

	// Test 2: Trie mode without trie should fallback to database
	dbRows := sqlmock.NewRows([]string{"name"}).
		AddRow("dog").
		AddRow("dragon")
	mock.ExpectQuery("SELECT `name` FROM `game_assets`").
		WithArgs("d%", 5).
		WillReturnRows(dbRows)

	service2 := &AssetCompletionService{
		db:   gormDB,
		mode: CompletionModeTrie, // Trie mode but no trie service
	}

	results2, err := service2.CompleteAssetName(ctx, "d", 5)
	assert.NoError(t, err)
	assert.Equal(t, []string{"dog", "dragon"}, results2)

	// Verify expectations
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

// TestAssetCompletionLLM_ParseSuggestions tests AI response parsing
func TestAssetCompletionLLM_ParseSuggestions(t *testing.T) {
	// Create mock database (not used in this test)
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	cpt := createMockCopilot()
	llmService := NewAssetCompletionLLM(cpt, gormDB)

	tests := []struct {
		name     string
		response string
		prefix   string
		expected []string
	}{
		{
			name: "Simple list",
			response: `cat_sprite
car_model
camera_icon`,
			prefix:   "ca",
			expected: []string{"cat_sprite", "car_model", "camera_icon"},
		},
		{
			name: "Numbered list",
			response: `1. cat_walking
2. car_racing
3. camera_flash`,
			prefix:   "ca",
			expected: []string{"cat_walking", "car_racing", "camera_flash"},
		},
		{
			name: "Bulleted list",
			response: `- cat animation
* car sound
• camera effect`,
			prefix:   "ca",
			expected: []string{"cat_animation", "car_sound", "camera_effect"},
		},
		{
			name: "Mixed formatting",
			response: `Here are some suggestions:
- Cat Sprite
2. Car Model
camera-icon
background_forest`,
			prefix:   "ca",
			expected: []string{"cat_sprite", "car_model", "camera_icon"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results := llmService.parseAISuggestions(tt.response, tt.prefix)

			// Check that we got some results
			assert.Greater(t, len(results), 0, "Should get at least one suggestion")

			// Check that all results are properly formatted (lowercase, underscores)
			for _, result := range results {
				assert.Regexp(t, `^[a-z0-9_]+$`, result, "Result should be lowercase with underscores only")
			}
		})
	}
}

// TestAssetCompletionLLM_ContextBuilding tests prompt building
func TestAssetCompletionLLM_ContextBuilding(t *testing.T) {
	// Create mock database
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	cpt := createMockCopilot()
	llmService := NewAssetCompletionLLM(cpt, gormDB)

	// Test system prompt building
	existingAssets := []string{"cat", "car", "camera", "dog", "dragon"}
	systemPrompt := llmService.buildSystemPrompt(existingAssets)

	assert.Contains(t, systemPrompt, "AI assistant", "Should contain AI assistant description")
	assert.Contains(t, systemPrompt, "creative", "Should mention creativity")
	assert.Contains(t, systemPrompt, "cat", "Should include sample existing assets")
	assert.Contains(t, systemPrompt, "lowercase", "Should mention formatting requirements")

	// Test user prompt building
	userPrompt := llmService.buildUserPrompt("ca", 5)
	assert.Contains(t, userPrompt, "ca", "Should include the prefix")
	assert.Contains(t, userPrompt, "5", "Should include the limit")
	assert.Contains(t, userPrompt, "creative", "Should ask for creative suggestions")
}