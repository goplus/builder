package controller

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

// AssetCompletionLLM provides AI-powered asset name completion
type AssetCompletionLLM struct {
	copilot     *copilot.Copilot
	db          *gorm.DB
	cache       map[string][]string
	cacheMutex  sync.RWMutex
	cacheExpiry time.Duration
	lastUpdate  time.Time
}

// NewAssetCompletionLLM creates a new LLM-based completion service
func NewAssetCompletionLLM(copilot *copilot.Copilot, db *gorm.DB) *AssetCompletionLLM {
	return &AssetCompletionLLM{
		copilot:     copilot,
		db:          db,
		cache:       make(map[string][]string),
		cacheExpiry: 10 * time.Minute, // Cache LLM responses for 10 minutes
	}
}

// CompleteAssetName provides AI-powered completion for asset names
func (l *AssetCompletionLLM) CompleteAssetName(ctx context.Context, prefix string, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 5
	}

	// Check cache first
	if cached := l.getCachedResults(prefix); cached != nil && len(cached) > 0 {
		if len(cached) > limit {
			return cached[:limit], nil
		}
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
		sampleSize := 20
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
	return fmt.Sprintf("Generate %d creative asset name suggestions that start with or are related to '%s'. "+
		"Consider different categories like sprites, backgrounds, sounds, animations, etc. "+
		"Make the names descriptive and suitable for game development.",
		limit, prefix)
}

// parseAISuggestions extracts suggestions from AI response
func (l *AssetCompletionLLM) parseAISuggestions(response, prefix string) []string {
	lines := strings.Split(response, "\n")
	var suggestions []string

	prefixLower := strings.ToLower(prefix)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Remove common prefixes like "1.", "-", "*", etc.
		line = strings.TrimLeft(line, "0123456789.-* \t")
		line = strings.TrimSpace(line)

		if line == "" {
			continue
		}

		// Convert to lowercase and replace spaces with underscores
		suggestion := strings.ToLower(line)
		suggestion = strings.ReplaceAll(suggestion, " ", "_")
		suggestion = strings.ReplaceAll(suggestion, "-", "_")

		// Remove any non-alphanumeric characters except underscores
		var cleaned strings.Builder
		for _, r := range suggestion {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
				cleaned.WriteRune(r)
			}
		}
		suggestion = cleaned.String()

		// Skip if empty after cleaning
		if suggestion == "" {
			continue
		}

		// Prefer suggestions that start with the prefix
		if strings.HasPrefix(suggestion, prefixLower) || prefixLower == "" {
			suggestions = append(suggestions, suggestion)
		}
	}

	// If we don't have enough suggestions that start with prefix, add related ones
	if len(suggestions) < 3 {
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			line = strings.TrimLeft(line, "0123456789.-* \t")
			line = strings.TrimSpace(line)

			if line == "" {
				continue
			}

			suggestion := strings.ToLower(line)
			suggestion = strings.ReplaceAll(suggestion, " ", "_")
			suggestion = strings.ReplaceAll(suggestion, "-", "_")

			var cleaned strings.Builder
			for _, r := range suggestion {
				if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
					cleaned.WriteRune(r)
				}
			}
			suggestion = cleaned.String()

			if suggestion == "" {
				continue
			}

			// Add if not already included and contains the prefix somewhere
			if !l.containsString(suggestions, suggestion) && strings.Contains(suggestion, prefixLower) {
				suggestions = append(suggestions, suggestion)
			}
		}
	}

	return suggestions
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

// getExistingAssets retrieves existing asset names from database
func (l *AssetCompletionLLM) getExistingAssets() ([]string, error) {
	var names []string
	err := l.db.Model(&model.GameAsset{}).
		Select("name").
		Order("name ASC").
		Limit(100). // Limit to avoid memory issues
		Pluck("name", &names).Error

	if err != nil {
		return nil, err
	}

	return names, nil
}

// getCachedResults retrieves cached results for a prefix
func (l *AssetCompletionLLM) getCachedResults(prefix string) []string {
	l.cacheMutex.RLock()
	defer l.cacheMutex.RUnlock()

	// Check if cache is expired
	if time.Since(l.lastUpdate) > l.cacheExpiry {
		return nil
	}

	if results, exists := l.cache[strings.ToLower(prefix)]; exists {
		return results
	}

	return nil
}

// cacheResults stores results in cache
func (l *AssetCompletionLLM) cacheResults(prefix string, results []string) {
	l.cacheMutex.Lock()
	defer l.cacheMutex.Unlock()

	l.cache[strings.ToLower(prefix)] = results
	l.lastUpdate = time.Now()
}

// ClearCache clears the LLM completion cache
func (l *AssetCompletionLLM) ClearCache() {
	l.cacheMutex.Lock()
	defer l.cacheMutex.Unlock()

	l.cache = make(map[string][]string)
	l.lastUpdate = time.Time{}
}

// GetCacheStats returns cache statistics
func (l *AssetCompletionLLM) GetCacheStats() map[string]interface{} {
	l.cacheMutex.RLock()
	defer l.cacheMutex.RUnlock()

	return map[string]interface{}{
		"mode":          "llm",
		"cache_size":    len(l.cache),
		"last_update":   l.lastUpdate,
		"cache_age":     time.Since(l.lastUpdate),
		"cache_expiry":  l.cacheExpiry,
		"needs_refresh": time.Since(l.lastUpdate) > l.cacheExpiry,
	}
}