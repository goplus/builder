package workflow

// Env represents a simple key-value environment for storing workflow context data
type Env map[string]interface{}

// NewEnv creates a new environment instance
func NewEnv() Env {
	return make(Env)
}

// Get retrieves a value from the environment by key
// Returns nil if the key doesn't exist
func (e Env) Get(key string) interface{} {
	if v, ok := e[key]; ok {
		return v
	}
	return nil
}

// Add stores a key-value pair in the environment
// Overwrites any existing value for the same key
func (e Env) Add(key string, value interface{}) {
	e[key] = value
}

// Delete removes a key-value pair from the environment
func (e Env) Delete(key string) {
	delete(e, key)
}

// Clear removes all key-value pairs from the environment
func (e Env) Clear() {
	for k := range e {
		delete(e, k)
	}
}
