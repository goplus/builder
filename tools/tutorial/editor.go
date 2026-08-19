package tutorial

// Editor groups the capabilities that observe and adjust the project editor
// the learner works in.
type Editor struct {
	Project    Project
	Runtime    Runtime
	CodeEditor CodeEditor
	Ruler      Ruler
}

// Project reads the session project the learner is editing.
type Project struct{}

// GetCode returns the given sprite's current code, including the learner's
// unsaved edits.
func (p *Project) GetCode(sprite string) string {
	var code string
	mustCallCapability("editor_project_getCode", struct {
		Sprite string `json:"sprite"`
	}{Sprite: sprite}, &code)
	return code
}

// ListSprites lists the session project's sprites by name. A Course whose goal
// is for the learner to create a sprite cannot know the name they will choose,
// so it discovers it here.
func (p *Project) ListSprites() []string {
	var sprites []string
	mustCallCapability("editor_project_listSprites", struct{}{}, &sprites)
	return sprites
}

// Runtime observes the learner's running project. Its callbacks run in the
// order the host reported them.
type Runtime struct{}

// OnStart registers a callback that runs when the learner's project starts.
func (p *Runtime) OnStart(handler func()) {
	setHandler(func(h *handlers) { h.runtimeStart = handler })
}

// OnExit registers a callback that runs when the learner's project exits.
func (p *Runtime) OnExit(handler func(code int)) {
	setHandler(func(h *handlers) { h.runtimeExit = handler })
}

// OnLog registers a callback that runs once for every log the learner's
// project prints, in order. This is the main judging channel: scene code
// prints a known line when the goal is reached, and the Course waits for it.
func (p *Runtime) OnLog(handler func(log string)) {
	setHandler(func(h *handlers) { h.runtimeLog = handler })
}

// CodeEditor adjusts the code editor the learner writes in.
type CodeEditor struct{}

// FilterAPIs limits the APIs offered by editor assistance to the given
// definition identifiers, so a lesson can show only what it teaches.
func (p *CodeEditor) FilterAPIs(apis []string) {
	mustCallCapability("editor_codeEditor_filterAPIs", struct {
		APIs []string `json:"apis"`
	}{APIs: apis}, nil)
}

// FormatWorkspace formats the learner's code.
func (p *CodeEditor) FormatWorkspace() {
	mustCallCapability("editor_codeEditor_formatWorkspace", struct{}{}, nil)
}

// Ruler is the measuring overlay on the stage, a teaching aid for coordinates
// and distances.
type Ruler struct{}

// Show displays the ruler over the stage.
func (p *Ruler) Show() {
	mustCallCapability("editor_ruler_show", struct{}{}, nil)
}

// Hide removes the ruler from the stage.
func (p *Ruler) Hide() {
	mustCallCapability("editor_ruler_hide", struct{}{}, nil)
}
