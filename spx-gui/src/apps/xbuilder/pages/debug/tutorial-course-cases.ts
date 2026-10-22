// Copied from docs/develop/tutorial-v2/example-tutorial-course/main_course.gox
// (frontend code does not import from outside its own directory). Keep in sync
// manually; the docs copy itself is compile-guarded by tools/xgoexec-bundle.
export const exampleCourseSource = `import "strings"

onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Move Lita to Mushroom. Click Mushroom's name to insert it into your code."
	showVideo "step-to"
	Spotlight.reveal "api-references", "Here is stepTo, the only block you need in this lesson."
}

Editor.Runtime.onLog log => {
	if strings.TrimSpace(log) == "reached-target" {
		code := Editor.Project.getCode("Lita")
		feedback := Copilot.generateText("Give one short sentence of feedback about this solution:\\n" + code)
		completeWith feedback
	}
}
`

export type CourseEvent = {
  name: string
  payload: unknown
}

export type CourseCase = {
  name: string
  /** What the case is meant to prove. */
  description: string
  /** The `main_course.gox` content to run. */
  source: string
  /** Events dispatched in order after the course starts. */
  events: CourseEvent[]
}

// A course exercising every author-facing framework API, adapted from the
// native integration test in tools/xgoexec-bundle/tutorial_test.go.
const fullApiCourseSource = `
import "strings"

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
}

Editor.Runtime.onExit code => {
	echo "exit code", code
}

Copilot.onRoundComplete round => {
	echo "round", round.UserMessage
}

Editor.Runtime.onLog log => {
	if strings.TrimSpace(log) != "reached-target" {
		return
	}
	for sprite <- Editor.Project.listSprites() {
		echo Editor.Project.getCode(sprite)
	}
	Editor.CodeEditor.formatWorkspace
	Editor.Ruler.disable

	feedback := &Feedback{}
	Copilot.generateJSON "judge this", feedback
	completeWith Copilot.generateText("praise the learner")
}
`

const completeInStartCourseSource = `
onStart => {
	showMessage "hello"
	complete
}
`

const unsubscribedEventsCourseSource = `
import "strings"

Editor.Runtime.onLog log => {
	if strings.TrimSpace(log) == "done" {
		complete
	}
}
`

// A course whose onLog pauses with wait and then checks that onExit ran
// meanwhile, so it fails instead of completing when the pause holds up other
// callbacks.
const waitCourseSource = `
var (
	exitSeen bool
)

Editor.Runtime.onLog log => {
	wait 0.5
	if !exitSeen {
		panic "onExit did not run while onLog paused"
	}
	complete
}

Editor.Runtime.onExit code => {
	exitSeen = true
}
`

// Runtime logs end with the line break println prints, as the real host passes them on, so a course comparing a log
// with its bare text fails here as it would in the Playground.
export const courseCases: CourseCase[] = [
  {
    name: 'Docs example course',
    description: 'The example from docs/develop/tutorial-v2 completes on the reached-target signal.',
    source: exampleCourseSource,
    events: [{ name: 'editor.runtime.log', payload: { log: 'reached-target\n' } }]
  },
  {
    name: 'Full API surface',
    description: 'Every author-facing API round-trips through the wasm bridge.',
    source: fullApiCourseSource,
    events: [
      { name: 'editor.runtime.start', payload: null },
      { name: 'copilot.roundComplete', payload: { userMessage: 'why', resultMessages: ['because'] } },
      { name: 'editor.runtime.exit', payload: { code: 0 } },
      { name: 'editor.runtime.log', payload: { log: 'reached-target\n' } }
    ]
  },
  {
    name: 'Completes during onStart',
    description: 'A course that completes before the event loop starts still exits as completed.',
    source: completeInStartCourseSource,
    events: []
  },
  {
    name: 'Ignores unsubscribed events',
    description: 'Events the course did not subscribe to are accepted and dropped without failing the run.',
    source: unsubscribedEventsCourseSource,
    events: [
      { name: 'editor.runtime.start', payload: null },
      { name: 'copilot.roundComplete', payload: { userMessage: 'hi', resultMessages: ['hello'] } },
      { name: 'editor.runtime.log', payload: { log: 'done\n' } }
    ]
  },
  {
    name: 'wait lets other callbacks run',
    description: 'While onLog pauses with wait, a later event starts its callback instead of waiting for the pause.',
    source: waitCourseSource,
    events: [
      { name: 'editor.runtime.log', payload: { log: 'pause\n' } },
      { name: 'editor.runtime.exit', payload: { code: 0 } }
    ]
  }
]
