// Package tutorial is the Tutorial class framework.
//
// A Playground Course is an XGo program written against this package: the
// Course code presents the lesson, observes what the learner does and decides
// when the goal is reached. The framework turns those calls into frontend
// capabilities and delivers host events back to the Course, in order, on the
// Course program's own goroutine.
//
// See docs/develop/tutorial-v2 for the contract this package implements.
package tutorial

const XGoPackage = true

// Course is the class every Tutorial program is written against. Its
// namespaces are exported because XGo lowercases method calls but not field
// access, so Course code reads Editor.CodeEditor.filterAPIs.
type Course struct {
	Editor    Editor
	Copilot   Copilot
	Spotlight Spotlight

	onStart func()
}

type CourseProto interface {
	MainEntry()
	Start()
}

type contentRequest struct {
	Content string `json:"content"`
}

// OnStart registers the callback that runs when the Course starts, after the
// Course program finished registering its other callbacks.
func (p *Course) OnStart(handler func()) { p.onStart = handler }

// ShowPrelude displays the Course opening guide and returns once the learner
// dismisses it.
func (p *Course) ShowPrelude(preludeMessage string) {
	mustCallCapability("course_showPrelude", contentRequest{Content: preludeMessage}, nil)
}

// ShowMessage displays a dialog and returns once the learner dismisses it.
func (p *Course) ShowMessage(message string) {
	mustCallCapability("course_showMessage", contentRequest{Content: message}, nil)
}

// ShowVideo displays a Course-local video and returns once the learner
// finishes watching or closes it.
func (p *Course) ShowVideo(videoPath string) {
	mustCallCapability("course_showVideo", struct {
		VideoPath string `json:"videoPath"`
	}{VideoPath: videoPath}, nil)
}

// Complete marks the Course as completed. The Course program keeps running to
// the end of the current callback and then exits; later completions are
// ignored.
func (p *Course) Complete() {
	if !markCompleted() {
		return
	}
	mustCallCapability("course_complete", struct{}{}, nil)
}

// CompleteWith is Complete with feedback shown to the learner.
func (p *Course) CompleteWith(message string) {
	if !markCompleted() {
		return
	}
	mustCallCapability("course_completeWith", contentRequest{Content: message}, nil)
}

// Start runs the Course program: it hands control to the Course's onStart
// callback and then delivers host events one at a time, in the order the host
// dispatched them, until the Course completes.
func (p *Course) Start() {
	if p.onStart != nil && !completed() {
		p.onStart()
	}

	program.Lock()
	events := program.events
	program.Unlock()

	for !completed() {
		callback, ok := <-events
		if !ok {
			return
		}
		callback()
	}
}

func Gopt_Course_Main(course CourseProto) {
	startProgram()
	course.MainEntry()
	course.Start()
}
