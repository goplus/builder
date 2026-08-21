package main

import (
	"testing"

	"github.com/goplus/ixgo"
	"github.com/goplus/ixgo/xgobuild"

	"github.com/goplus/builder/tools/xgoexec"
)

// courseSource 是一段"用满全部作者可见 API"的课程程序。
//
// 它同时守住两件事：
//  1. classfile 绑定是否还正常——课程代码能不能按 XGo 的写法调到框架
//     （字段大写、方法小写、onXxx 事件写法、SpotlightOptions 字面量等）；
//  2. qexp 导出有没有忘记重新生成——新增的类型（如 SpotlightOptions）若没进
//     ixgo 的注册表，这里编译/准备执行就会失败。第二点尤其容易漏，
//     因为它平时只在运行期才暴露。
const courseSource = `
type Feedback struct {
	Praise string
	Score  int
}

onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	Editor.Ruler.show
	showPrelude "Move Lita to Mushroom."
	showVideo "assets/step-to.mp4"
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

func TestTutorialCourseBuilds(t *testing.T) {
	if err := (tutorialFramework{}).Register(); err != nil {
		t.Fatalf("register tutorial framework: %v", err)
	}

	ctx := ixgo.NewContext(ixgo.SupportMultipleInterp | xgobuild.StaticLoad)
	for _, path := range xgoexec.StandardPackages {
		if _, err := ctx.Loader.Import(path); err != nil {
			t.Fatalf("import standard package %q: %v", path, err)
		}
	}

	files := xgoexec.MapFS{"main_course.gox": []byte(courseSource)}
	source, err := xgobuild.BuildFSDir(ctx, files, ".")
	if err != nil {
		t.Fatalf("build course: %v", err)
	}

	pkg, err := ctx.LoadFile("main.go", source)
	if err != nil {
		t.Fatalf("load course: %v", err)
	}
	// 只准备到"可执行"为止，不真的跑：真正运行会调 capability，而 capability 桥
	// 只在 js/wasm 下存在。运行期行为由 tools/tutorial 的单测用假宿主覆盖。
	if _, err := ctx.NewInterp(pkg); err != nil {
		t.Fatalf("prepare course for execution: %v", err)
	}
}
