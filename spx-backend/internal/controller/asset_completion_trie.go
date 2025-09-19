package controller

import (
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
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
	refreshing  atomic.Bool // Atomic flag to prevent multiple concurrent refreshes
	minDepth    int  // Minimum depth to start storing namesMap (memory optimization)
}

// NewAssetCompletionTrie creates a new trie-based completion service
func NewAssetCompletionTrie(db *gorm.DB) *AssetCompletionTrie {
	return newAssetCompletionTrieWithConfig(db)
}

// newAssetCompletionTrieWithConfig creates a new trie-based completion service with environment configuration
func newAssetCompletionTrieWithConfig(db *gorm.DB) *AssetCompletionTrie {
	cacheExpiry := 30 * time.Minute // Default cache expiry

	// Check for custom cache expiry from environment
	if envExpiry := os.Getenv(EnvTrieCacheExpiry); envExpiry != "" {
		if minutes, err := strconv.Atoi(envExpiry); err == nil && minutes > 0 {
			cacheExpiry = time.Duration(minutes) * time.Minute
		}
	}

	service := &AssetCompletionTrie{
		root:        &TrieNode{children: make(map[rune]*TrieNode)},
		db:          db,
		cacheExpiry: cacheExpiry,
		minDepth:    2, // Only store namesMap from depth 2 onwards (configurable)
	}

	// Initial load
	service.RefreshCache()

	return service
}

// RefreshCache loads all asset names from database into memory trie
func (t *AssetCompletionTrie) RefreshCache() error {
	// 1. Atomic check if already refreshing (no lock needed)
	if !t.refreshing.CompareAndSwap(false, true) {
		return nil // Already refreshing
	}
	defer t.refreshing.Store(false)

	// 2. Load all asset names from database (outside lock - expensive operation)
	var assets []model.GameAsset
	err := t.db.Select("name").Find(&assets).Error
	if err != nil {
		return err
	}

	// 3. Build new trie in memory (outside lock - expensive operation)
	newRoot := &TrieNode{
		children: make(map[rune]*TrieNode),
		namesMap: make(map[string]struct{}),
	}

	for _, asset := range assets {
		t.insertToNode(newRoot, strings.ToLower(asset.Name), asset.Name)
	}

	// 4. Quick atomic replacement with lock (fast operation)
	t.updateMutex.Lock()
	defer t.updateMutex.Unlock()

	// Quick replacement
	t.root = newRoot
	t.lastUpdate = time.Now()
	return nil
}

// insert adds a name to the trie (requires lock for shared root)
func (t *AssetCompletionTrie) insert(key, originalName string) {
	t.updateMutex.Lock()
	defer t.updateMutex.Unlock()
	t.insertToNode(t.root, key, originalName)
}

// insertToNode adds a name to a specific trie node (used for building new trees)
func (t *AssetCompletionTrie) insertToNode(root *TrieNode, key, originalName string) {
	node := root
	depth := 0

	for _, char := range key {
		if node.children[char] == nil {
			// Only initialize namesMap if depth >= minDepth (memory optimization)
			var namesMap map[string]struct{}
			if depth >= t.minDepth {
				namesMap = make(map[string]struct{})
			}
			node.children[char] = &TrieNode{
				children: make(map[rune]*TrieNode),
				namesMap: namesMap,
			}
		}
		node = node.children[char]
		depth++

		// Only store names if depth >= minDepth and namesMap exists
		if depth >= t.minDepth && node.namesMap != nil {
			if _, exists := node.namesMap[originalName]; !exists {
				node.namesMap[originalName] = struct{}{}
				node.dirty = true // Mark for slice rebuild
			}
		}
	}

	node.isEnd = true
}

// getNames returns the names slice, rebuilding it from the map if dirty
func (n *TrieNode) getNames() []string {
	// Return nil if no namesMap (shallow nodes)
	if n.namesMap == nil {
		return nil
	}

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

	// Check if cache needs refresh (atomic check, no lock needed)
	if time.Since(t.lastUpdate) > t.cacheExpiry && !t.refreshing.Load() {
		// Async refresh without releasing lock
		go t.RefreshCache()
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

	// If prefix is too short (< minDepth), collect from all descendant nodes
	if len(lowerPrefix) < t.minDepth {
		return t.collectFromDescendants(node, lowerPrefix)
	}

	// Return names stored at this node (prefix >= minDepth)
	nodeNames := node.getNames()
	if nodeNames == nil {
		// If no namesMap at this node, collect from descendants
		return t.collectFromDescendants(node, lowerPrefix)
	}

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
		"mode":          "trie",
		"last_update":   t.lastUpdate,
		"cache_age":     time.Since(t.lastUpdate),
		"cache_expiry":  t.cacheExpiry,
		"needs_refresh": time.Since(t.lastUpdate) > t.cacheExpiry,
		"refreshing":    t.refreshing.Load(),
		"node_count":    nodeCount,
		"total_names":   totalNames,
		"trie_enabled":  true,
		"llm_enabled":   false,
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

// collectFromDescendants collects names from all descendant nodes (for short prefixes)
func (t *AssetCompletionTrie) collectFromDescendants(node *TrieNode, prefix string) []string {
	var results []string
	visited := make(map[string]struct{})
	
	t.dfsCollect(node, prefix, visited, &results)
	
	// Sort results
	sort.Strings(results)
	return results
}

// dfsCollect performs depth-first search to collect names from nodes with namesMap
func (t *AssetCompletionTrie) dfsCollect(node *TrieNode, prefix string, visited map[string]struct{}, results *[]string) {
	if node == nil {
		return
	}
	
	// If this node has namesMap, collect names from it
	if node.namesMap != nil {
		for name := range node.namesMap {
			if _, exists := visited[name]; !exists {
				visited[name] = struct{}{}
				*results = append(*results, name)
			}
		}
	}
	
	// Recursively collect from children
	for _, child := range node.children {
		t.dfsCollect(child, prefix, visited, results)
	}
}
