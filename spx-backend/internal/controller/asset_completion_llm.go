package controller

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/model"
)

const (
	// DefaultCacheExpiry is the default cache expiration time
	DefaultCacheExpiry = 10 * time.Minute
	// MaxExistingAssetsForContext limits how many existing assets to include in AI context
	MaxExistingAssetsForContext = 100
	// MaxSampleAssetsInPrompt limits assets shown in system prompt
	MaxSampleAssetsInPrompt = 20
	// MinSuggestions is the minimum number of suggestions before adding related ones
	MinSuggestions = 3
)

// Configuration environment variable names
const (
	EnvAssetCompletionMode     = "ASSET_COMPLETION_MODE"
	EnvEnableTrieCompletion    = "ENABLE_ASSET_COMPLETION_TRIE"
	EnvLLMCacheExpiry         = "LLM_CACHE_EXPIRY_MINUTES"
	EnvTrieCacheExpiry        = "TRIE_CACHE_EXPIRY_MINUTES"
)

// cacheEntry represents a cached completion result with its timestamp
type cacheEntry struct {
	results  []string
	cachedAt time.Time
}

// singleflightResult represents the result of a singleflight operation
type singleflightResult struct {
	results []string
	err     error
}

// AssetCompletionLLM provides AI-powered asset name completion
type AssetCompletionLLM struct {
	copilot     *copilot.Copilot
	db          *gorm.DB
	cache       map[string]cacheEntry
	cacheMutex  sync.RWMutex
	cacheExpiry time.Duration
	// singleflight to prevent concurrent requests for same prefix
	inflight    map[string]chan singleflightResult
	inflightMu  sync.Mutex
}

// NewAssetCompletionLLM creates a new LLM-based completion service
func NewAssetCompletionLLM(copilot *copilot.Copilot, db *gorm.DB) *AssetCompletionLLM {
	return newAssetCompletionLLMWithConfig(copilot, db)
}

// newAssetCompletionLLMWithConfig creates a new LLM-based completion service with environment configuration
func newAssetCompletionLLMWithConfig(copilot *copilot.Copilot, db *gorm.DB) *AssetCompletionLLM {
	cacheExpiry := DefaultCacheExpiry

	// Check for custom cache expiry from environment
	if envExpiry := os.Getenv(EnvLLMCacheExpiry); envExpiry != "" {
		if minutes, err := strconv.Atoi(envExpiry); err == nil && minutes > 0 {
			cacheExpiry = time.Duration(minutes) * time.Minute
		}
	}

	return &AssetCompletionLLM{
		copilot:     copilot,
		db:          db,
		cache:       make(map[string]cacheEntry),
		cacheExpiry: cacheExpiry,
		inflight:    make(map[string]chan singleflightResult),
	}
}

// CompleteAssetName provides AI-powered completion for asset names
func (l *AssetCompletionLLM) CompleteAssetName(ctx context.Context, prefix string, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 5
	}

	// Use singleflight pattern to prevent concurrent requests for same prefix
	cacheKey := strings.ToLower(prefix)
	results, err := l.singleflight(ctx, cacheKey, func() ([]string, error) {
		// Double-check cache inside singleflight to ensure thread safety
		if cached := l.getCachedResults(prefix); cached != nil && len(cached) > 0 {
			return cached, nil
		}

		// Get existing asset names for context
		existingAssets, err := l.getExistingAssets()
		if err != nil {
			return nil, fmt.Errorf("failed to get existing assets: %w", err)
		}

		// Generate AI-powered suggestions
		suggestions, err := l.generateSuggestions(ctx, prefix, existingAssets, limit)
		if err != nil {
			return nil, fmt.Errorf("failed to generate AI suggestions: %w", err)
		}

		// Cache results
		l.cacheResults(prefix, suggestions)

		return suggestions, nil
	})

	if err != nil {
		return nil, err
	}

	if len(results) > limit {
		return results[:limit], nil
	}
	return results, nil
}

// generateSuggestions uses AI to generate creative asset name suggestions
func (l *AssetCompletionLLM) generateSuggestions(ctx context.Context, prefix string, existingAssets []string, limit int) ([]string, error) {
	// Build context for AI
	systemPrompt := l.buildSystemPrompt(existingAssets)
	userPrompt := l.buildUserPrompt(prefix, limit)

	// Prepare copilot parameters
	params := &copilot.Params{
		System: copilot.Content{
			Type: copilot.ContentTypeText,
			Text: systemPrompt,
		},
		Messages: []copilot.Message{
			{
				Role: copilot.RoleUser,
				Content: copilot.Content{
					Type: copilot.ContentTypeText,
					Text: userPrompt,
				},
			},
		},
	}

	// Get AI response
	result, err := l.copilot.Message(ctx, params, false) // Use regular model, not premium
	if err != nil {
		return nil, fmt.Errorf("failed to get AI response: %w", err)
	}

	// Parse suggestions from AI response
	suggestions := l.parseAISuggestions(result.Message.Content.Text, prefix)

	// Limit results
	if len(suggestions) > limit {
		suggestions = suggestions[:limit]
	}

	return suggestions, nil
}

// buildSystemPrompt creates the system prompt for AI completion
func (l *AssetCompletionLLM) buildSystemPrompt(existingAssets []string) string {
	var builder strings.Builder

	builder.WriteString("You are an AI assistant that helps generate creative and relevant asset names for a game development platform. ")
	builder.WriteString("Your task is to suggest asset names that are:\n")
	builder.WriteString("1. Creative and descriptive\n")
	builder.WriteString("2. Relevant to game development (sprites, sounds, images, etc.)\n")
	builder.WriteString("3. Follow common naming conventions (lowercase, underscore-separated)\n")
	builder.WriteString("4. Avoid duplication with existing assets\n\n")

	if len(existingAssets) > 0 {
		builder.WriteString("Here are some existing asset names for reference:\n")
		// Show a sample of existing assets (limit to avoid token overflow)
		sampleSize := MaxSampleAssetsInPrompt
		if len(existingAssets) < sampleSize {
			sampleSize = len(existingAssets)
		}
		for i := 0; i < sampleSize; i++ {
			builder.WriteString("- ")
			builder.WriteString(existingAssets[i])
			builder.WriteString("\n")
		}
		if len(existingAssets) > sampleSize {
			builder.WriteString(fmt.Sprintf("... and %d more assets\n", len(existingAssets)-sampleSize))
		}
		builder.WriteString("\n")
	}

	builder.WriteString("Please provide suggestions in a simple list format, one per line, without numbers or bullets.")

	return builder.String()
}

// buildUserPrompt creates the user prompt for AI completion
func (l *AssetCompletionLLM) buildUserPrompt(prefix string, limit int) string {
	// Handle Chinese input with bilingual prompt
	if containsChinese(prefix) {
		return fmt.Sprintf("请根据关键词'%s'生成%d个游戏素材名称建议。要求：\n"+
			"1. 所有建议必须包含或以'%s'开头\n"+
			"2. 适合游戏开发的素材名称\n"+
			"3. 涵盖不同类型：精灵动画、音效、UI界面、背景图、道具等\n"+
			"4. 名称要具体描述功能，如：%s_跳跃动画、%s_攻击音效、%s_头像图标\n"+
			"5. 使用下划线连接词语\n"+
			"请直接列出建议，每行一个，不要编号：",
			prefix, limit, prefix, prefix, prefix, prefix)
	}
	// English prompt for English input
	return fmt.Sprintf("Generate %d creative asset name suggestions that start with or are related to '%s'. "+
		"Consider different categories like sprites, backgrounds, sounds, animations, etc. "+
		"Make the names descriptive and suitable for game development.",
		limit, prefix)
}

// cleanAndFormatSuggestion cleans and formats a single suggestion line
func (l *AssetCompletionLLM) cleanAndFormatSuggestion(line string) string {
	line = strings.TrimSpace(line)
	if line == "" {
		return ""
	}

	// Remove common prefixes like "1.", "-", "*", etc.
	line = strings.TrimLeft(line, "0123456789.-* \t")
	line = strings.TrimSpace(line)

	if line == "" {
		return ""
	}

	// Replace spaces and hyphens with underscores, but keep original case for Chinese
	suggestion := line
	suggestion = strings.ReplaceAll(suggestion, " ", "_")
	suggestion = strings.ReplaceAll(suggestion, "-", "_")

	// Only convert ASCII letters to lowercase, preserve Chinese characters
	var normalized strings.Builder
	for _, r := range suggestion {
		if r >= 'A' && r <= 'Z' {
			normalized.WriteRune(r + 32) // Convert to lowercase
		} else {
			normalized.WriteRune(r)
		}
	}
	suggestion = normalized.String()

	// Remove any invalid characters but keep Chinese characters, ASCII letters, numbers, and underscores
	var cleaned strings.Builder
	for _, r := range suggestion {
		if isValidAssetNameChar(r) {
			cleaned.WriteRune(r)
		}
	}
	return cleaned.String()
}

// parseAISuggestions extracts suggestions from AI response
func (l *AssetCompletionLLM) parseAISuggestions(response, prefix string) []string {
	lines := strings.Split(response, "\n")
	var exactMatches []string
	var relatedMatches []string
	seenSuggestions := make(map[string]struct{})

	prefixLower := strings.ToLower(prefix)

	// Process all lines in a single pass
	for _, line := range lines {
		suggestion := l.cleanAndFormatSuggestion(line)
		if suggestion == "" {
			continue
		}

		// Skip duplicates
		if _, exists := seenSuggestions[suggestion]; exists {
			continue
		}
		seenSuggestions[suggestion] = struct{}{}

		// For Chinese input, be more lenient with matching
		if containsChinese(prefix) {
			// For Chinese, just accept all valid suggestions since AI understands the context
			exactMatches = append(exactMatches, suggestion)
		} else {
			// Categorize suggestions for English input
			if strings.HasPrefix(suggestion, prefixLower) || prefixLower == "" {
				exactMatches = append(exactMatches, suggestion)
			} else if strings.Contains(suggestion, prefixLower) {
				relatedMatches = append(relatedMatches, suggestion)
			}
		}
	}

	// Return exact matches first, add related ones if needed
	result := exactMatches
	if len(result) < MinSuggestions {
		needed := MinSuggestions - len(result)
		if needed > len(relatedMatches) {
			needed = len(relatedMatches)
		}
		result = append(result, relatedMatches[:needed]...)
	}

	return result
}

// containsString checks if a slice contains a string
func (l *AssetCompletionLLM) containsString(slice []string, str string) bool {
	for _, s := range slice {
		if s == str {
			return true
		}
	}
	return false
}

// containsChinese checks if a string contains Chinese characters
func containsChinese(s string) bool {
	for _, r := range s {
		if r >= 0x4e00 && r <= 0x9fff { // CJK Unified Ideographs range
			return true
		}
	}
	return false
}

// isValidAssetNameChar checks if a character is valid for asset names
func isValidAssetNameChar(r rune) bool {
	// ASCII letters and numbers
	if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
		return true
	}
	// Underscore
	if r == '_' {
		return true
	}
	// Chinese characters (CJK Unified Ideographs)
	if r >= 0x4e00 && r <= 0x9fff {
		return true
	}
	// Additional Chinese characters ranges
	if (r >= 0x3400 && r <= 0x4dbf) || // CJK Extension A
		(r >= 0x20000 && r <= 0x2a6df) || // CJK Extension B
		(r >= 0x2a700 && r <= 0x2b73f) || // CJK Extension C
		(r >= 0x2b740 && r <= 0x2b81f) || // CJK Extension D
		(r >= 0x2b820 && r <= 0x2ceaf) { // CJK Extension E
		return true
	}
	return false
}

// getExistingAssets retrieves existing asset names from database
func (l *AssetCompletionLLM) getExistingAssets() ([]string, error) {
	var names []string
	err := l.db.Model(&model.GameAsset{}).
		Select("name").
		Order("name ASC").
		Limit(MaxExistingAssetsForContext).
		Pluck("name", &names).Error

	if err != nil {
		return nil, err
	}

	return names, nil
}

// singleflight ensures only one goroutine fetches data for the same key
func (l *AssetCompletionLLM) singleflight(ctx context.Context, key string, fn func() ([]string, error)) ([]string, error) {
	l.inflightMu.Lock()

	// Check if there's already a request in flight for this key
	if ch, exists := l.inflight[key]; exists {
		l.inflightMu.Unlock()
		// Wait for the in-flight request to complete
		select {
		case result := <-ch:
			return result.results, result.err
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	// Create a channel for this request
	ch := make(chan singleflightResult, 1)
	l.inflight[key] = ch
	l.inflightMu.Unlock()

	// Execute the function and broadcast result
	results, err := fn()
	result := singleflightResult{results: results, err: err}

	// Send result and clean up
	l.inflightMu.Lock()
	ch <- result
	close(ch)
	delete(l.inflight, key)
	l.inflightMu.Unlock()

	return results, err
}

// getCachedResults retrieves cached results for a prefix
func (l *AssetCompletionLLM) getCachedResults(prefix string) []string {
	l.cacheMutex.RLock()
	defer l.cacheMutex.RUnlock()

	if entry, exists := l.cache[strings.ToLower(prefix)]; exists {
		// Check if this specific entry is expired
		if time.Since(entry.cachedAt) <= l.cacheExpiry {
			// Return a copy to prevent external modification
			resultCopy := make([]string, len(entry.results))
			copy(resultCopy, entry.results)
			return resultCopy
		}
	}

	return nil
}

// cacheResults stores results in cache
func (l *AssetCompletionLLM) cacheResults(prefix string, results []string) {
	l.cacheMutex.Lock()
	defer l.cacheMutex.Unlock()

	l.cache[strings.ToLower(prefix)] = cacheEntry{
		results:  results,
		cachedAt: time.Now(),
	}
}

// ClearCache clears the LLM completion cache
func (l *AssetCompletionLLM) ClearCache() {
	l.cacheMutex.Lock()
	defer l.cacheMutex.Unlock()

	l.cache = make(map[string]cacheEntry)
}

// GetCacheStats returns cache statistics
func (l *AssetCompletionLLM) GetCacheStats() map[string]interface{} {
	l.cacheMutex.RLock()
	defer l.cacheMutex.RUnlock()

	// Calculate average cache age and expired entries
	var totalAge time.Duration
	expiredCount := 0
	now := time.Now()

	for _, entry := range l.cache {
		age := now.Sub(entry.cachedAt)
		totalAge += age
		if age > l.cacheExpiry {
			expiredCount++
		}
	}

	var avgAge time.Duration
	if len(l.cache) > 0 {
		avgAge = totalAge / time.Duration(len(l.cache))
	}

	return map[string]interface{}{
		"mode":          "llm",
		"cache_size":    len(l.cache),
		"expired_count": expiredCount,
		"avg_cache_age": avgAge,
		"cache_expiry":  l.cacheExpiry,
		"trie_enabled":  false,
		"llm_enabled":   true,
	}
}
