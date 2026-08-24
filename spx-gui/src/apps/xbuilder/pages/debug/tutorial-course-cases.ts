import exampleCourseSource from '../../../../../../docs/develop/tutorial-v2/example-tutorial-course/main_course.gox?raw'

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
	echo "exit code", code
}

Copilot.onRoundFinish round => {
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
	Editor.Ruler.hide

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
Editor.Runtime.onLog log => {
	if log == "done" {
		complete
	}
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
      { name: 'copilot.roundFinish', payload: { userMessage: 'why', resultMessages: ['because'] } },
      { name: 'editor.runtime.exit', payload: { code: 0 } },
      { name: 'editor.runtime.log', payload: { log: 'reached-target' } }
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
      { name: 'copilot.roundFinish', payload: { userMessage: 'hi', resultMessages: ['hello'] } },
      { name: 'editor.runtime.log', payload: { log: 'done' } }
    ]
  }
]
