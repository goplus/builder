package main

import (
	"os"
	"testing"

	"github.com/goplus/ixgo"
	"github.com/goplus/ixgo/xgobuild"

	"github.com/goplus/builder/tools/xgoexec"
)

// courseSource is a Course program that exercises every author-facing API.
//
// It guards two things at once:
//  1. that the classfile binding still works — whether Course code can reach
//     the framework the way XGo spells it (capitalized fields, lower-cased
//     methods, the onXxx event form, SpotlightOptions literals and so on);
//  2. that the qexp export was regenerated — a newly added type such as
//     SpotlightOptions missing from ixgo's registry makes compiling or
//     preparing this fail. The second one is especially easy to miss, since
//     it otherwise only surfaces at run time.
const courseSource = `
type Feedback struct {
	Praise string
	Score  int
}

onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	Editor.Ruler.show
	showPrelude "Move Lita to Mushroom."
	showVideo "step-to"
	Spotlight.reveal "Code editor > Code text editor", "Write your code here"
	Spotlight.revealWith "Stage overview", "Watch Lita", SpotlightOptions{Mask: false, Duration: 3}
}

Editor.Runtime.onStart => {
	showMessage "Running!"
}

Editor.Runtime.onExit code => {
	echo code
}

Copilot.onRoundFinish round => {
	echo round.UserMessage
}

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	for sprite <- Editor.Project.listSprites() {
		echo Editor.Project.getCode(sprite)
	}
	Editor.CodeEditor.formatWorkspace
	Editor.Ruler.hide

	feedback := &Feedback{}
	Copilot.generateJSON "judge this", feedback
	if feedback.Score > 3 {
		completeWith Copilot.generateText("praise the learner")
	} else {
		complete
	}
}
`

// buildCourse compiles a Course program through the real runtime pipeline:
// register the classfile project, preload the standard packages, compile with
// xgobuild, load with ixgo.
//
// It only goes as far as "ready to execute" and never actually runs: running
// would call capabilities, and the capability bridge exists only under
// js/wasm. Run-time behavior is covered by tools/tutorial's unit tests against
// a fake host.
func buildCourse(t *testing.T, courseSource []byte) {
	t.Helper()

	if err := (tutorialFramework{}).Register(); err != nil {
		t.Fatalf("register tutorial framework: %v", err)
	}

	ctx := ixgo.NewContext(ixgo.SupportMultipleInterp | xgobuild.StaticLoad)
	for _, path := range xgoexec.StandardPackages {
		if _, err := ctx.Loader.Import(path); err != nil {
			t.Fatalf("import standard package %q: %v", path, err)
		}
	}

	files := xgoexec.MapFS{"main_course.gox": courseSource}
	source, err := xgobuild.BuildFSDir(ctx, files, ".")
	if err != nil {
		t.Fatalf("build course: %v", err)
	}

	pkg, err := ctx.LoadFile("main.go", source)
	if err != nil {
		t.Fatalf("load course: %v", err)
	}
	if _, err := ctx.NewInterp(pkg); err != nil {
		t.Fatalf("prepare course for execution: %v", err)
	}
}

func TestTutorialCourseBuilds(t *testing.T) {
	buildCourse(t, []byte(courseSource))
}

// TestExampleCourseBuilds compiles the example Course from docs, keeping the
// documented example in step with the framework implementation. That example
// used to be written entirely by hand and never compiled, and sat for a long
// time with a syntax error in it — a paren-less command call cannot be used as
// an expression. This test stops it rotting again.
func TestExampleCourseBuilds(t *testing.T) {
	source, err := os.ReadFile("../../docs/develop/tutorial-v2/example-tutorial-course/main_course.gox")
	if err != nil {
		t.Fatalf("read example course: %v", err)
	}
	buildCourse(t, source)
}
