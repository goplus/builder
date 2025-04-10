package ai

import "sync"

var (
	// defaultKnowledgeBase is the default knowledge base for AI players.
	defaultKnowledgeBase   map[string]any
	defaultKnowledgeBaseMu sync.RWMutex
)

// DefaultKnowledgeBase returns the default knowledge base for AI players. The
// knowledge base provides a common context that AI players can access,
// enabling consistent understanding of the game world.
func DefaultKnowledgeBase() map[string]any {
	defaultKnowledgeBaseMu.RLock()
	defer defaultKnowledgeBaseMu.RUnlock()
	return defaultKnowledgeBase
}

// SetDefaultKnowledgeBase sets the default knowledge base for AI players.
func SetDefaultKnowledgeBase(kb map[string]any) {
	defaultKnowledgeBaseMu.Lock()
	defer defaultKnowledgeBaseMu.Unlock()
	defaultKnowledgeBase = kb
}
