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

// Only the latest "reached-target" matters: a newer signal cancels a
// judgement that is still waiting on Copilot.
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		code := Editor.Project.getCode("Lita")
		feedback, err := Copilot.generateText("Give one short sentence of feedback about this solution:\\n" + code)
		if err != nil {
			feedback = "Lita reached Mushroom. Well done!"
		}
		completeWith feedback
	}
}
`

// Copied from docs/develop/tutorial-v2/example-tutorial-course-run-groups/main_course.gox,
// kept in sync by hand like the copy above.
export const runGroupsExampleCourseSource = `// This Course exists to show how run groups relate runs that overlap. The
// lesson itself is the one in example-tutorial-course: walk Lita to Mushroom
// with stepTo.
//
// Judging can start from three places, and only the latest trigger should
// count: a learner who fixes the code and runs again while Copilot is still
// judging the previous attempt must see one verdict, the newer one. All three
// callbacks therefore start runs of one group with CancelPrevious. Hints are a
// separate concern with a separate policy: from the third stop on each stop
// gets a hint, shown one after another, so they live in their own group with
// OneAtATime.

type Verdict struct {
	Passed  bool
	Comment string
}

func judge(trigger string) {
	code := Editor.Project.getCode("Lita")
	prompt := "Trigger: " + trigger + "\\nLita's code:\\n" + code +
		"\\nDoes this code walk Lita to Mushroom with stepTo? Set Passed accordingly and comment in one sentence."
	verdict := &Verdict{}
	if err := Copilot.generateJSON(prompt, verdict); err != nil {
		showMessage "Copilot could not judge this attempt. Run the project again to try once more."
		return
	}
	if verdict.Passed {
		completeWith verdict.Comment
		return
	}
	showMessage verdict.Comment
}

judging := newRunGroup(CancelPrevious)
hints := newRunGroup(OneAtATime)
attempts := 0

onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Walk Lita to Mushroom with stepTo, then run the project: Mushroom prints \\"reached-target\\" when Lita gets there."
	Spotlight.reveal "api-references", "stepTo is the only block you need."
}

// The project printing the signal. Logs arrive for every print, so the
// callback filters first and only then starts a judging run: output that is
// not the signal never touches the group and cancels nothing.
Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		judge("the project printed reached-target")
	}
}

// The project exiting. Same group, so an exit while an earlier judgement is
// still waiting cancels that judgement.
Editor.Runtime.onExit code => {
	judging.start => {
		judge("the project exited")
	}
}

// A Copilot round completing. Same group again: it cancels a judgement
// started by a log or an exit, and is cancelled by them in turn.
Copilot.onRoundComplete round => {
	judging.start => {
		judge("the learner finished a Copilot round about: " + round.UserMessage)
	}
}

// Hints are independent of judging, so they have their own group. Counting
// the stop stays outside it; only the dialog is protected, and quick stops in
// a row show their hints one after another rather than as a pile of dialogs.
Editor.Runtime.onExit code => {
	attempts++
	if attempts < 3 {
		return
	}
	hints.start => {
		showMessage "Hint: stepTo takes a sprite name, like stepTo Mushroom."
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

// The mock host rejects these Copilot requests; the course completes with its fallback.
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
    name: 'Run groups example course',
    description: 'The run-groups example from docs starts a judging run from a filtered log and completes.',
    source: runGroupsExampleCourseSource,
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
