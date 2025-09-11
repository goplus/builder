package controller

import (
	"fmt"
	"os"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

// AssetCompletionService handles asset auto-completion
type AssetCompletionService struct {
	db   *gorm.DB
	trie *AssetCompletionTrie
}

// newAssetCompletionService creates a new asset completion service
func newAssetCompletionService(db *gorm.DB) *AssetCompletionService {
	service := &AssetCompletionService{db: db}

	// Initialize trie-based completion if enabled
	if os.Getenv("ENABLE_ASSET_COMPLETION_TRIE") == "true" {
		service.trie = NewAssetCompletionTrie(db)
	}

	return service
}

// CompleteAssetName provides auto-completion for asset names
func (s *AssetCompletionService) CompleteAssetName(prefix string, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 5
	}

	// Use trie if available (faster)
	if s.trie != nil {
		return s.trie.CompleteAssetName(prefix, limit)
	}

	// Fallback to database query
	return s.completeFromDatabase(prefix, limit)
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

// RefreshCache manually refreshes the trie cache
func (s *AssetCompletionService) RefreshCache() error {
	if s.trie != nil {
		return s.trie.RefreshCache()
	}
	return nil
}

// GetCacheStats returns cache statistics
func (s *AssetCompletionService) GetCacheStats() map[string]interface{} {
	if s.trie != nil {
		return s.trie.GetCacheStats()
	}
	return map[string]interface{}{
		"mode":         "database_only",
		"trie_enabled": false,
	}
}
