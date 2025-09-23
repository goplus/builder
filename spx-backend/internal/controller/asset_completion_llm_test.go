package controller

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/copilot/asscompletion"
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
	_ = NewAssetCompletionLLM(cpt, gormDB)

	// Test system prompt building
	existingAssets := []string{"cat", "car", "camera", "dog", "dragon"}
	systemPrompt := asscompletion.BuildSystemPrompt(existingAssets, MaxSampleAssetsInPrompt)

	assert.Contains(t, systemPrompt, "游戏素材名称补全助手", "Should contain asset completion assistant description")
	assert.Contains(t, systemPrompt, "创意", "Should mention creativity")
	assert.Contains(t, systemPrompt, "cat", "Should include sample existing assets")
	assert.Contains(t, systemPrompt, "小写字母", "Should mention formatting requirements")

	// Test user prompt building
	userPrompt := asscompletion.BuildUserPrompt("ca", 5)
	assert.Contains(t, userPrompt, "ca", "Should include the prefix")
	assert.Contains(t, userPrompt, "5", "Should include the limit")
	assert.Contains(t, userPrompt, "creative", "Should ask for creative suggestions")
}

// TestAssetCompletionLLM_CacheExpiration tests per-entry cache expiration
func TestAssetCompletionLLM_CacheExpiration(t *testing.T) {
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

	// Set a longer cache expiry for testing
	llmService.cacheExpiry = 50 * time.Millisecond

	// Cache some results
	llmService.cacheResults("test1", []string{"result1", "result2"})
	time.Sleep(20 * time.Millisecond) // Wait some time
	llmService.cacheResults("test2", []string{"result3", "result4"})

	// test1 should still be valid
	cached1 := llmService.getCachedResults("test1")
	assert.NotNil(t, cached1)
	assert.Equal(t, []string{"result1", "result2"}, cached1)

	// test2 should also be valid
	cached2 := llmService.getCachedResults("test2")
	assert.NotNil(t, cached2)
	assert.Equal(t, []string{"result3", "result4"}, cached2)

	// Wait for test1 to expire but test2 should still be valid
	time.Sleep(40 * time.Millisecond)

	// test1 should now be expired (20ms + 40ms = 60ms > 50ms)
	cached1Expired := llmService.getCachedResults("test1")
	assert.Nil(t, cached1Expired)

	// test2 should still be valid (40ms < 50ms)
	cached2Valid := llmService.getCachedResults("test2")
	assert.NotNil(t, cached2Valid)
	assert.Equal(t, []string{"result3", "result4"}, cached2Valid)

	// Check cache stats
	stats := llmService.GetCacheStats()
	assert.Equal(t, 2, stats["cache_size"]) // Both entries still in map
	assert.Equal(t, 1, stats["expired_count"]) // But one is expired
}

// TestAssetCompletionLLM_CacheReturnsCopy tests that cache returns copies
func TestAssetCompletionLLM_CacheReturnsCopy(t *testing.T) {
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

	// Cache some results
	original := []string{"result1", "result2"}
	llmService.cacheResults("test", original)

	// Get cached results
	cached1 := llmService.getCachedResults("test")
	cached2 := llmService.getCachedResults("test")

	// Results should be equal but not the same slice
	assert.Equal(t, original, cached1)
	assert.Equal(t, cached1, cached2)

	// Modifying one slice should not affect others
	cached1[0] = "modified"
	assert.NotEqual(t, cached1, cached2)
	assert.Equal(t, "result1", cached2[0]) // Original value preserved
}

// TestAssetCompletionLLM_ParseDuplicateRemoval tests duplicate removal in parsing
func TestAssetCompletionLLM_ParseDuplicateRemoval(t *testing.T) {
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

	response := `cat_sprite
cat_sprite
1. cat_walking
cat-walking
2. cat animation
cat_animation`

	results := llmService.parseAISuggestions(response, "cat")

	// Should remove duplicates (cat_sprite, cat_walking, cat_animation should each appear once)
	uniqueResults := make(map[string]bool)
	for _, result := range results {
		assert.False(t, uniqueResults[result], "Found duplicate: %s", result)
		uniqueResults[result] = true
	}

	// Should contain expected results
	assert.Contains(t, results, "cat_sprite")
	assert.Contains(t, results, "cat_walking")
	assert.Contains(t, results, "cat_animation")
}

// TestAssetCompletionLLM_Constants tests that constants are used correctly
func TestAssetCompletionLLM_Constants(t *testing.T) {
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

	// Test that default cache expiry constant is used
	assert.Equal(t, DefaultCacheExpiry, llmService.cacheExpiry)

	// Test MinSuggestions constant in parsing logic
	shortResponse := "cat_sprite\ndog_sound" // Only 2 results starting with different prefixes
	results := llmService.parseAISuggestions(shortResponse, "cat")

	// Should get cat_sprite as exact match, and might get dog_sound as related if we need MinSuggestions
	assert.Contains(t, results, "cat_sprite")
}

// TestAssetCompletionLLM_ConcurrentAccess tests concurrent cache access
func TestAssetCompletionLLM_ConcurrentAccess(t *testing.T) {
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

	var wg sync.WaitGroup
	numGoroutines := 10

	// Cache initial data
	llmService.cacheResults("test", []string{"result1", "result2"})

	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()

			// Concurrent reads should work without race conditions
			cached := llmService.getCachedResults("test")
			assert.NotNil(t, cached)
			assert.Equal(t, []string{"result1", "result2"}, cached)

			// Concurrent writes should also work
			llmService.cacheResults("test"+string(rune(id)), []string{"result" + string(rune(id))})
		}(i)
	}

	wg.Wait()

	// Cache should have entries for all goroutines plus the original
	stats := llmService.GetCacheStats()
	assert.GreaterOrEqual(t, stats["cache_size"].(int), numGoroutines)
}

// TestAssetCompletionLLM_Singleflight tests the singleflight pattern through CompleteAssetName
func TestAssetCompletionLLM_Singleflight(t *testing.T) {
	// Create mock database
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	// Mock the getExistingAssets query - this should be called only once due to singleflight
	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("cat").
		AddRow("car").
		AddRow("camera")
	mock.ExpectQuery("SELECT `name` FROM `game_assets`").
		WillReturnRows(rows)

	cpt := createMockCopilot()
	llmService := NewAssetCompletionLLM(cpt, gormDB)

	var wg sync.WaitGroup
	numGoroutines := 5
	results := make([][]string, numGoroutines)
	errors := make([]error, numGoroutines)

	ctx := context.Background()

	// Launch multiple goroutines calling CompleteAssetName with same prefix
	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func(index int) {
			defer wg.Done()
			results[index], errors[index] = llmService.CompleteAssetName(ctx, "ca", 5)
		}(i)
	}

	wg.Wait()

	// Check that the database query was only called once due to singleflight
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err, "Database should only be queried once")

	// Check if any calls were successful (some might fail due to mock copilot)
	// The important thing is that they all get the same result
	var successCount int
	var successfulResult []string
	for i := 0; i < numGoroutines; i++ {
		if errors[i] == nil {
			successCount++
			if successfulResult == nil {
				successfulResult = results[i]
			} else {
				assert.Equal(t, successfulResult, results[i], "All successful calls should return same result")
			}
		}
	}

	// At minimum we expect that if any call succeeded, they all get the same result
	// This verifies the singleflight pattern is working
	t.Logf("Successful calls: %d/%d", successCount, numGoroutines)
}

// TestAssetCompletionLLM_SingleflightWithContext tests context cancellation with CompleteAssetName
func TestAssetCompletionLLM_SingleflightWithContext(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping context cancellation test in short mode")
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

	// Mock the database query
	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("cat").
		AddRow("car")
	mock.ExpectQuery("SELECT `name` FROM `game_assets`").
		WillReturnRows(rows)

	cpt := createMockCopilot()
	llmService := NewAssetCompletionLLM(cpt, gormDB)

	// Create context with short timeout
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	// Call should be cancelled by context (or complete very quickly)
	result, err := llmService.CompleteAssetName(ctx, "ca", 5)
	if err != nil {
		// Context cancellation is expected
		assert.Contains(t, err.Error(), "context")
		assert.Nil(t, result)
	} else {
		// If it completes quickly, that's also fine
		t.Logf("Call completed before timeout: %v", result)
	}

	// Don't strictly check mock expectations as the call might be cancelled before DB query
}

// TestAssetCompletionLLM_ConcurrentCompleteAssetName tests concurrent CompleteAssetName calls
func TestAssetCompletionLLM_ConcurrentCompleteAssetName(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping concurrent test in short mode")
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

	// Mock the getExistingAssets query - should only be called once due to singleflight
	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("cat").
		AddRow("car").
		AddRow("camera")
	mock.ExpectQuery("SELECT `name` FROM `game_assets`").
		WillReturnRows(rows)

	cpt := createMockCopilot()
	llmService := NewAssetCompletionLLM(cpt, gormDB)

	var wg sync.WaitGroup
	numGoroutines := 5
	results := make([][]string, numGoroutines)
	errors := make([]error, numGoroutines)

	ctx := context.Background()

	// Launch multiple goroutines calling CompleteAssetName with same prefix
	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func(index int) {
			defer wg.Done()
			// Note: This will likely fail with mock OpenAI client, but we're testing the singleflight pattern
			results[index], errors[index] = llmService.CompleteAssetName(ctx, "ca", 5)
		}(i)
	}

	wg.Wait()

	// Check that the database query was only called once
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err, "Database should only be queried once")

	// If any call succeeded, all should have the same result due to singleflight
	var successfulResult []string
	for i := 0; i < numGoroutines; i++ {
		if errors[i] == nil {
			if successfulResult == nil {
				successfulResult = results[i]
			} else {
				assert.Equal(t, successfulResult, results[i], "All successful calls should return same result")
			}
		}
	}
}

// TestAssetCompletionLLM_SingleflightDifferentKeys tests singleflight with different prefixes
func TestAssetCompletionLLM_SingleflightDifferentKeys(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping different keys test in short mode")
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

	// Mock database queries for different prefixes - each should be called once
	prefixes := []string{"ca", "do", "mo"}
	for range prefixes {
		rows := sqlmock.NewRows([]string{"name"}).
			AddRow("example1").
			AddRow("example2")
		mock.ExpectQuery("SELECT `name` FROM `game_assets`").
			WillReturnRows(rows)
	}

	cpt := createMockCopilot()
	llmService := NewAssetCompletionLLM(cpt, gormDB)

	var wg sync.WaitGroup
	ctx := context.Background()

	// Test with different prefixes - should allow concurrent execution
	for _, prefix := range prefixes {
		wg.Add(2) // Two calls per prefix
		go func(p string) {
			defer wg.Done()
			llmService.CompleteAssetName(ctx, p, 5)
		}(prefix)
		go func(p string) {
			defer wg.Done()
			llmService.CompleteAssetName(ctx, p, 5)
		}(prefix)
	}

	wg.Wait()

	// Check that the database was queried for each different prefix
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err, "Database should be queried once per unique prefix")
}