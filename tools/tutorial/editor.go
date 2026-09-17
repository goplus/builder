package tutorial

// Editor gathers the capabilities around the project editor the learner works
// in.
//
// The split between the four namespaces was settled point by point in review:
//   - Project reads the project model, addressed by domain concepts (sprite
//     names);
//   - Runtime observes the learner's project running (start, exit, logs);
//   - CodeEditor controls the editor UI itself (filtering APIs, formatting);
//   - Ruler is the measuring aid on the stage.
//
// Mind the Project/CodeEditor boundary in particular: reading code belongs to
// Project, because SpxProject's existing interfaces are all defined around
// domain concepts and their names, while controlling the UI belongs to
// CodeEditor. Reading whichever code the learner happens to be editing is
// deliberately not offered yet: it depends on how the code editor exposes its
// attached UIs and their active document, and waits for that to settle.
type Editor struct {
	Project    Project
	Runtime    Runtime
	CodeEditor CodeEditor
	Ruler      Ruler
}

// init points the four namespaces at the Course's run state; Course.initCourse
// calls it.
func (p *Editor) init(program *courseProgram) {
	p.Project.courseProgram = program
	p.Runtime.courseProgram = program
	p.CodeEditor.courseProgram = program
	p.Ruler.courseProgram = program
}

// Project reads the session project the learner is editing.
type Project struct {
	courseProgram *courseProgram
}

// GetCode returns the given sprite's current code in the session project.
//
// Addressing by sprite name rather than file path matches the style of
// SpxProject's existing interfaces: the author need not know the spx
// convention that "Lita" lives in Lita.spx. A sprite that does not exist fails
// the capability and therefore panics, so a misspelled name blows up during
// Preview instead of silently yielding an empty string the Course carries on
// with.
func (p *Project) GetCode(sprite string) string {
	var code string
	p.courseProgram.mustCallCapability("editor_project_getCode", struct {
		Sprite string `json:"sprite"`
	}{Sprite: sprite}, &code)
	return code
}

// ListSprites lists the sprite names in the session project.
//
// It exists for one concrete kind of Course: when the goal is for the learner
// to create a sprite themselves, the author cannot know the name they will
// choose and has to ask the project at run time.
func (p *Project) ListSprites() []string {
	var sprites []string
	p.courseProgram.mustCallCapability("editor_project_listSprites", struct{}{}, &sprites)
	return sprites
}

// Runtime observes the learner's project as it runs.
//
// These OnXxx only record the callback in the Course's run state; the actual
// event registration happens once, during package initialization (see
// events.go). Whether the Course subscribed to an event therefore makes no
// difference to the host, which need not know what the Course subscribed to.
//
// Each event has three overloads, which XGo groups by the __N suffix: the
// callback alone; a RunPolicy before the callback, which puts every run of
// that callback in a private group from its first statement; and a RunGroup
// before the callback, which joins every run to that shared group from the
// start. A callback that filters its triggers should enter() after the
// filter, and giving a policy at registration suits only low-frequency,
// unfiltered events — see policy.go.
type Runtime struct {
	courseProgram *courseProgram
}

// OnStart__0 registers a callback for the learner's project starting to run.
// Several may be registered.
func (p *Runtime) OnStart__0(handler func()) {
	p.onStart(nil, handler)
}

// OnStart__1 is OnStart with a run policy.
func (p *Runtime) OnStart__1(policy RunPolicy, handler func()) {
	p.onStart(&runGroup{p: p.courseProgram, policy: policy}, handler)
}

// OnStart__2 is OnStart joining a run group.
func (p *Runtime) OnStart__2(group RunGroup, handler func()) {
	p.onStart(groupOf(group), handler)
}

func (p *Runtime) onStart(group *runGroup, handler func()) {
	register(p.courseProgram, group, func(struct{}) { handler() },
		func(h *handlers, r *registration[struct{}]) { h.runtimeStart = append(h.runtimeStart, r) })
}

// OnExit__0 registers a callback for the learner's project exiting, where
// code is the exit code. Several may be registered.
func (p *Runtime) OnExit__0(handler func(code int)) {
	p.onExit(nil, handler)
}

// OnExit__1 is OnExit with a run policy.
func (p *Runtime) OnExit__1(policy RunPolicy, handler func(code int)) {
	p.onExit(&runGroup{p: p.courseProgram, policy: policy}, handler)
}

// OnExit__2 is OnExit joining a run group.
func (p *Runtime) OnExit__2(group RunGroup, handler func(code int)) {
	p.onExit(groupOf(group), handler)
}

func (p *Runtime) onExit(group *runGroup, handler func(code int)) {
	register(p.courseProgram, group, handler,
		func(h *handlers, r *registration[int]) { h.runtimeExit = append(h.runtimeExit, r) })
}

// OnLog__0 registers a callback for the learner's project appending a log
// entry: each entry starts one run.
//
// This is the main judging channel: the Course project's scene code prints an
// agreed string when something important happens (say "reached-target"), and
// Course code waiting for that signal here learns what the learner achieved.
// Only kind=log output arrives; runtime errors take another path, so they
// cannot pollute judging.
//
// Several callbacks may be registered: with two judging clues in one Course,
// writing two handlers reads better than cramming both into one if-else.
// Runs of one callback may overlap; for "latest wins" or "ignore while busy",
// enter() a run group with the matching policy after the filter.
func (p *Runtime) OnLog__0(handler func(log string)) {
	p.onLog(nil, handler)
}

// OnLog__1 is OnLog with a run policy.
func (p *Runtime) OnLog__1(policy RunPolicy, handler func(log string)) {
	p.onLog(&runGroup{p: p.courseProgram, policy: policy}, handler)
}

// OnLog__2 is OnLog joining a run group.
func (p *Runtime) OnLog__2(group RunGroup, handler func(log string)) {
	p.onLog(groupOf(group), handler)
}

func (p *Runtime) onLog(group *runGroup, handler func(log string)) {
	register(p.courseProgram, group, handler,
		func(h *handlers, r *registration[string]) { h.runtimeLog = append(h.runtimeLog, r) })
}

// CodeEditor controls the editor the learner writes code in.
type CodeEditor struct {
	courseProgram *courseProgram
}

// FilterAPIs limits which APIs appear in the editor's assistance (API
// Reference, completion and so on), so one Course exposes only what it
// teaches and the cognitive load stays low.
//
// Each entry is a full definition identifier, of the form
// "xgo:github.com/goplus/spx/v3?Sprite.stepTo"; omitting #<overloadId>
// addresses every overload of the name. A shorthand like "stepTo" is
// deliberately not supported: resolving one into a full identifier needs
// mapping logic, and that logic cannot reliably assume the package is spx and
// the receiver is Sprite. The typing burden on authors is for the Course
// Editor's authoring assistance to solve.
func (p *CodeEditor) FilterAPIs(apis []string) {
	p.courseProgram.mustCallCapability("editor_codeEditor_filterAPIs", struct {
		APIs []string `json:"apis"`
	}{APIs: apis}, nil)
}

// FormatWorkspace formats the learner's code and returns once formatting is
// done.
func (p *CodeEditor) FormatWorkspace() {
	p.courseProgram.mustCallCapability("editor_codeEditor_formatWorkspace", struct{}{}, nil)
}

// Ruler is the ruler on the stage, a teaching aid that builds the learner's
// intuition for coordinates and distances.
type Ruler struct {
	courseProgram *courseProgram
}

// Show displays the ruler over the stage.
func (p *Ruler) Show() {
	p.courseProgram.mustCallCapability("editor_ruler_show", struct{}{}, nil)
}

// Hide removes the ruler from the stage.
func (p *Ruler) Hide() {
	p.courseProgram.mustCallCapability("editor_ruler_hide", struct{}{}, nil)
}
