package main

import (
	"fmt"
	"os"
	"slices"
	"strings"
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
	Editor.Ruler.enable
	showPrelude "Move Lita to Mushroom."
	showVideo "step-to"
	Spotlight.reveal "code-text-editor", "Write your code here"
	Spotlight.revealWith "stage-overview", "Watch Lita", SpotlightOptions{Mask: false, Duration: 3}
}

Editor.Runtime.onStart => {
	showMessage "Running!"
	wait 0.5
}

Editor.Runtime.onExit code => {
	echo code
}

Copilot.onRoundComplete round => {
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
	Editor.Ruler.disable

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

// TestGuideCoursesBuild compiles every ```go block of the course-author guide,
// tools/tutorial/README.md and its Chinese mirror README.zh.md, as a complete
// Course, so that the snippets a reader copies keep compiling as the framework
// evolves. It also checks that both languages carry the same code blocks in
// the same order: the Chinese guide translates the prose, never the code. A
// deliberate fragment belongs in a ```text fence, which this test ignores.
func TestGuideCoursesBuild(t *testing.T) {
	en := guideCodeBlocks(t, "../tutorial/README.md")
	zh := guideCodeBlocks(t, "../tutorial/README.zh.md")
	if len(en) == 0 {
		t.Fatal("expected ```go blocks in tools/tutorial/README.md, found none")
	}
	if !slices.Equal(en, zh) {
		t.Errorf("README.md and README.zh.md differ in their ```go blocks (%d vs %d blocks, first difference at block %d)",
			len(en), len(zh), firstDifference(en, zh))
	}
	for i, block := range en {
		t.Run(fmt.Sprintf("block-%02d", i+1), func(t *testing.T) {
			buildCourse(t, []byte(block))
		})
	}
}

// guideCodeBlocks returns the contents of the ```go fenced blocks of a Markdown
// file, in order. A fence line holds the fence alone, give or take surrounding
// whitespace, so an indented fence or one with trailing spaces still counts.
func guideCodeBlocks(t *testing.T, path string) []string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read guide: %v", err)
	}
	var blocks []string
	var current []string
	inBlock := false
	for _, line := range strings.Split(string(data), "\n") {
		switch {
		case !inBlock && strings.TrimSpace(line) == "```go":
			inBlock = true
			current = nil
		case inBlock && strings.TrimSpace(line) == "```":
			inBlock = false
			blocks = append(blocks, strings.Join(current, "\n")+"\n")
		case inBlock:
			current = append(current, line)
		}
	}
	if inBlock {
		t.Fatalf("%s: unterminated ```go block", path)
	}
	return blocks
}

// firstDifference returns the 1-based index of the first block at which a and
// b differ; when one is a prefix of the other, that is the shorter length plus
// one.
func firstDifference(a, b []string) int {
	n := min(len(a), len(b))
	for i := 0; i < n; i++ {
		if a[i] != b[i] {
			return i + 1
		}
	}
	return n + 1
}
