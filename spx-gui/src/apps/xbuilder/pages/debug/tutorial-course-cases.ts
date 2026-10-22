import { failingCopilotMessagePrefix } from './tutorial-mock-host'

// Copied from docs/develop/tutorial-v2/example-tutorial-course/main_course.gox
// (frontend code does not import from outside its own directory). Keep in sync
// manually; the docs copy itself is compile-guarded by tools/xgoexec-bundle.
export const exampleCourseSource = `onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Move Lita to Mushroom. Click Mushroom's name to insert it into your code."
	showVideo "step-to"
	Spotlight.reveal "api-references", "Here is stepTo, the only block you need in this lesson."
}

Editor.Runtime.onLog log => {
	if log == "reached-target" {
		code := Editor.Project.getCode("Lita")
		feedback, err := Copilot.generateText("Give one short sentence of feedback about this solution:\\n" + code)
		if err != nil {
			feedback = "Lita reached Mushroom. Well done!"
		}
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
	if log != "reached-target" {
		return
	}
	for sprite <- Editor.Project.listSprites() {
		echo Editor.Project.getCode(sprite)
	}
	Editor.CodeEditor.formatWorkspace
	Editor.Ruler.disable

	feedback := &Feedback{}
	if err := Copilot.generateJSON("judge this", feedback); err != nil {
		echo "generateJSON failed:", err
	}
	completeWith Copilot.generateText("praise the learner")?:"Well done!"
}
`

// A course whose Copilot requests the mock host rejects, standing in for a
// network or quota failure: it must get the errors back and complete with its
// fallback instead of failing.
const copilotFailureCourseSource = `
type Review struct {
	Passed bool
}

Editor.Runtime.onLog log => {
	_, err := Copilot.generateText("${failingCopilotMessagePrefix}praise the learner")
	if err == nil {
		panic "generateText did not return the failure"
	}
	review := &Review{Passed: true}
	if err := Copilot.generateJSON("${failingCopilotMessagePrefix}judge this", review); err == nil || !review.Passed {
		panic "generateJSON did not return the failure and keep the result"
	}
	completeWith Copilot.generateText("${failingCopilotMessagePrefix}praise again")?:"Well done!"
}
`

const completeInStartCourseSource = `
onStart => {
	showMessage "hello"
	complete
}
`

const unsubscribedEventsCourseSource = `
Editor.Runtime.onLog log => {
	if log == "done" {
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

export const courseCases: CourseCase[] = [
  {
    name: 'Docs example course',
    description: 'The example from docs/develop/tutorial-v2 completes on the reached-target signal.',
    source: exampleCourseSource,
    events: [{ name: 'editor.runtime.log', payload: { log: 'reached-target' } }]
  },
  {
    name: 'Full API surface',
    description: 'Every author-facing API round-trips through the wasm bridge.',
    source: fullApiCourseSource,
    events: [
      { name: 'editor.runtime.start', payload: null },
      { name: 'copilot.roundComplete', payload: { userMessage: 'why', resultMessages: ['because'] } },
      { name: 'editor.runtime.exit', payload: { code: 0 } },
      { name: 'editor.runtime.log', payload: { log: 'reached-target' } }
    ]
  },
  {
    name: 'Copilot failures fall back',
    description: 'Rejected Copilot requests come back to the course as errors, and it completes with its fallback.',
    source: copilotFailureCourseSource,
    events: [{ name: 'editor.runtime.log', payload: { log: 'reached-target' } }]
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
      { name: 'editor.runtime.log', payload: { log: 'done' } }
    ]
  },
  {
    name: 'wait lets other callbacks run',
    description: 'While onLog pauses with wait, a later event starts its callback instead of waiting for the pause.',
    source: waitCourseSource,
    events: [
      { name: 'editor.runtime.log', payload: { log: 'pause' } },
      { name: 'editor.runtime.exit', payload: { code: 0 } }
    ]
  }
]
