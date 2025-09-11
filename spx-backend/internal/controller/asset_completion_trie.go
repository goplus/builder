package controller

import (
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

// TrieNode represents a node in the prefix tree
type TrieNode struct {
	children map[rune]*TrieNode
	isEnd    bool
	names    []string // Store complete names at this node
}

// AssetCompletionTrie provides fast auto-completion using prefix tree
type AssetCompletionTrie struct {
	root        *TrieNode
	db          *gorm.DB
	lastUpdate  time.Time
	updateMutex sync.RWMutex
	cacheExpiry time.Duration
}

// NewAssetCompletionTrie creates a new trie-based completion service
func NewAssetCompletionTrie(db *gorm.DB) *AssetCompletionTrie {
	service := &AssetCompletionTrie{
		root:        &TrieNode{children: make(map[rune]*TrieNode)},
		db:          db,
		cacheExpiry: 30 * time.Minute, // Cache expires every 30 minutes
	}

	// Initial load
	service.RefreshCache()

	return service
}

// RefreshCache loads all asset names from database into memory trie
func (t *AssetCompletionTrie) RefreshCache() error {
	t.updateMutex.Lock()
	defer t.updateMutex.Unlock()

	// Load all asset names from database
	var assets []model.GameAsset
	err := t.db.Select("name").Find(&assets).Error
	if err != nil {
		return err
	}

	// Rebuild trie
	t.root = &TrieNode{children: make(map[rune]*TrieNode)}

	for _, asset := range assets {
		t.insert(strings.ToLower(asset.Name), asset.Name)
	}

	t.lastUpdate = time.Now()
	return nil
}

// insert adds a name to the trie
func (t *AssetCompletionTrie) insert(key, originalName string) {
	node := t.root

	for _, char := range key {
		if node.children[char] == nil {
			node.children[char] = &TrieNode{children: make(map[rune]*TrieNode)}
		}
		node = node.children[char]

		// Add original name to each node along the path
		if node.names == nil {
			node.names = make([]string, 0)
		}

		// Avoid duplicates
		found := false
		for _, existing := range node.names {
			if existing == originalName {
				found = true
				break
			}
		}
		if !found {
			node.names = append(node.names, originalName)
		}
	}

	node.isEnd = true
}

// search finds all names with the given prefix
func (t *AssetCompletionTrie) search(prefix string) []string {
	t.updateMutex.RLock()
	defer t.updateMutex.RUnlock()

	// Check if cache needs refresh
	if time.Since(t.lastUpdate) > t.cacheExpiry {
		// Release read lock and acquire write lock for refresh
		t.updateMutex.RUnlock()
		go t.RefreshCache() // Async refresh
		t.updateMutex.RLock()
	}

	node := t.root
	lowerPrefix := strings.ToLower(prefix)

	// Navigate to the prefix node
	for _, char := range lowerPrefix {
		if node.children[char] == nil {
			return []string{} // Prefix not found
		}
		node = node.children[char]
	}

	// Return all names at this node (already filtered by prefix)
	result := make([]string, len(node.names))
	copy(result, node.names)

	// Sort alphabetically
	sort.Strings(result)

	return result
}

// CompleteAssetName provides fast auto-completion using trie
func (t *AssetCompletionTrie) CompleteAssetName(prefix string, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 5
	}

	results := t.search(prefix)

	// Limit results
	if len(results) > limit {
		results = results[:limit]
	}

	return results, nil
}

// GetCacheStats returns cache statistics
func (t *AssetCompletionTrie) GetCacheStats() map[string]interface{} {
	t.updateMutex.RLock()
	defer t.updateMutex.RUnlock()

	return map[string]interface{}{
		"last_update":   t.lastUpdate,
		"cache_age":     time.Since(t.lastUpdate),
		"cache_expiry":  t.cacheExpiry,
		"needs_refresh": time.Since(t.lastUpdate) > t.cacheExpiry,
	}
}
