package controller

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

// CompletionMode defines the completion mode
type CompletionMode string

const (
	CompletionModeDatabase CompletionMode = "database"
	CompletionModeTrie     CompletionMode = "trie"
	CompletionModeLLM      CompletionMode = "llm"
)

// AssetCompletionService handles asset auto-completion
type AssetCompletionService struct {
	db   *gorm.DB
	trie *AssetCompletionTrie
	llm  *AssetCompletionLLM
	mode CompletionMode
}

// newAssetCompletionService creates a new asset completion service
func newAssetCompletionService(db *gorm.DB, copilot *copilot.Copilot) *AssetCompletionService {
	service := &AssetCompletionService{db: db}

	// Determine completion mode from environment
	mode := os.Getenv("ASSET_COMPLETION_MODE")
	switch mode {
	case "llm":
		service.mode = CompletionModeLLM
		if copilot != nil {
			service.llm = NewAssetCompletionLLM(copilot, db)
		} else {
			// Fallback to trie if copilot is not available
			service.mode = CompletionModeTrie
		}
	case "trie":
		service.mode = CompletionModeTrie
	default:
		service.mode = CompletionModeDatabase
	}

	// Initialize trie-based completion if enabled or as fallback
	if service.mode == CompletionModeTrie || os.Getenv("ENABLE_ASSET_COMPLETION_TRIE") == "true" {
		service.trie = NewAssetCompletionTrie(db)
		if service.mode == CompletionModeDatabase {
			service.mode = CompletionModeTrie
		}
	}

	return service
}

// CompleteAssetName provides auto-completion for asset names
func (s *AssetCompletionService) CompleteAssetName(ctx context.Context, prefix string, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 5
	}

	switch s.mode {
	case CompletionModeLLM:
		if s.llm != nil {
			return s.llm.CompleteAssetName(ctx, prefix, limit)
		}
		// Fallback to trie
		fallthrough
	case CompletionModeTrie:
		if s.trie != nil {
			return s.trie.CompleteAssetName(prefix, limit)
		}
		// Fallback to database
		fallthrough
	default:
		return s.completeFromDatabase(prefix, limit)
	}
}

// completeFromDatabase provides database-based completion (fallback)
func (s *AssetCompletionService) completeFromDatabase(prefix string, limit int) ([]string, error) {
	var names []string
	err := s.db.Model(&model.GameAsset{}).
		Where("LOWER(name) LIKE ?", strings.ToLower(prefix)+"%").
		Order("name ASC").
		Limit(limit).
		Pluck("name", &names).Error

	if err != nil {
		return nil, fmt.Errorf("failed to complete asset names: %w", err)
	}

	return names, nil
}

// RefreshCache manually refreshes the cache
func (s *AssetCompletionService) RefreshCache() error {
	switch s.mode {
	case CompletionModeLLM:
		if s.llm != nil {
			s.llm.ClearCache()
		}
	case CompletionModeTrie:
		if s.trie != nil {
			return s.trie.RefreshCache()
		}
	}
	return nil
}

// GetCacheStats returns cache statistics
func (s *AssetCompletionService) GetCacheStats() map[string]interface{} {
	switch s.mode {
	case CompletionModeLLM:
		if s.llm != nil {
			return s.llm.GetCacheStats()
		}
	case CompletionModeTrie:
		if s.trie != nil {
			return s.trie.GetCacheStats()
		}
	}
	return map[string]interface{}{
		"mode":         string(s.mode),
		"trie_enabled": s.trie != nil,
		"llm_enabled":  s.llm != nil,
	}
}
