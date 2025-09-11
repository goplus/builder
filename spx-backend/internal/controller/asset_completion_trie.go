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
	namesMap map[string]struct{} // Store complete names at this node for O(1) dedup
	names    []string            // Cached slice for read operations
	dirty    bool                // Flag to indicate if names slice needs rebuild
}

// AssetCompletionTrie provides fast auto-completion using prefix tree
type AssetCompletionTrie struct {
	root        *TrieNode
	db          *gorm.DB
	lastUpdate  time.Time
	updateMutex sync.RWMutex
	cacheExpiry time.Duration
	refreshing  bool // Flag to prevent multiple concurrent refreshes
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

	// If already refreshing, skip
	if t.refreshing {
		return nil
	}
	t.refreshing = true
	defer func() { t.refreshing = false }()

	// Load all asset names from database
	var assets []model.GameAsset
	err := t.db.Select("name").Find(&assets).Error
	if err != nil {
		return err
	}

	// Rebuild trie
	t.root = &TrieNode{
		children: make(map[rune]*TrieNode),
		namesMap: make(map[string]struct{}),
	}

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
			node.children[char] = &TrieNode{
				children: make(map[rune]*TrieNode),
				namesMap: make(map[string]struct{}),
			}
		}
		node = node.children[char]

		// Add original name to each node along the path (O(1) dedup)
		if _, exists := node.namesMap[originalName]; !exists {
			node.namesMap[originalName] = struct{}{}
			node.dirty = true // Mark for slice rebuild
		}
	}

	node.isEnd = true
}

// getNames returns the names slice, rebuilding it from the map if dirty
func (n *TrieNode) getNames() []string {
	if n.dirty || n.names == nil {
		// Rebuild names slice from map with pre-allocated capacity
		n.names = make([]string, 0, len(n.namesMap))
		for name := range n.namesMap {
			n.names = append(n.names, name)
		}
		// Sort once during rebuild for better cache performance
		sort.Strings(n.names)
		n.dirty = false
	}
	return n.names
}

// getNamesCount returns the number of names without building the slice
func (n *TrieNode) getNamesCount() int {
	return len(n.namesMap)
}

// search finds all names with the given prefix
func (t *AssetCompletionTrie) search(prefix string) []string {
	t.updateMutex.RLock()
	defer t.updateMutex.RUnlock()

	// Check if cache needs refresh
	if time.Since(t.lastUpdate) > t.cacheExpiry && !t.refreshing {
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
	nodeNames := node.getNames()
	// Names are already sorted in getNames(), so just copy
	result := make([]string, len(nodeNames))
	copy(result, nodeNames)

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

	// Calculate trie statistics
	nodeCount, totalNames := t.calculateTrieStats(t.root)

	return map[string]interface{}{
		"last_update":   t.lastUpdate,
		"cache_age":     time.Since(t.lastUpdate),
		"cache_expiry":  t.cacheExpiry,
		"needs_refresh": time.Since(t.lastUpdate) > t.cacheExpiry,
		"refreshing":    t.refreshing,
		"node_count":    nodeCount,
		"total_names":   totalNames,
	}
}

// calculateTrieStats recursively calculates trie statistics
func (t *AssetCompletionTrie) calculateTrieStats(node *TrieNode) (nodeCount, totalNames int) {
	if node == nil {
		return 0, 0
	}
	
	nodeCount = 1
	totalNames = node.getNamesCount()
	
	for _, child := range node.children {
		childNodes, childNames := t.calculateTrieStats(child)
		nodeCount += childNodes
		totalNames += childNames
	}
	
	return nodeCount, totalNames
}
