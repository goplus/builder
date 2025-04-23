package workflow

type Env map[string]interface{}

func NewEnv() Env {
	return make(Env)
}

func (e Env) Get(key string) interface{} {
	if v, ok := e[key]; ok {
		return v
	}
	return nil
}

func (e Env) Add(key string, value interface{}) {
	e[key] = value
}

func (e Env) Delete(key string) {
	delete(e, key)
}

func (e Env) Clear() {
	for k := range e {
		delete(e, k)
	}
}
