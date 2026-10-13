// Copied from docs/develop/tutorial-v2/example-tutorial-course/main_course.gox
// (frontend code does not import from outside its own directory). Keep in sync
// manually; the docs copy itself is compile-guarded by tools/xgoexec-bundle.
export const exampleCourseSource = `onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Move Lita to Mushroom. Click Mushroom's name to insert it into your code."
	showVideo "step-to"
	// TODO(#3441): "API References" is the target's Radar node name; revisit
	// once the Radar name-based selector syntax is settled.
	Spotlight.reveal "API References", "Here is stepTo, the only block you need in this lesson."
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
		feedback := Copilot.generateText("Give one short sentence of feedback about this solution:\\n" + code)
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
// triggers therefore start runs of one group with CancelPrevious. Hints are a
// separate concern with a separate policy: from the third stop on each stop
// gets a hint, shown one after another, so they live in a private group with
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
	Copilot.generateJSON(prompt, verdict)
	if verdict.Passed {
		completeWith verdict.Comment
		return
	}
	showMessage verdict.Comment
}

judging := newRunGroup(CancelPrevious)
attempts := 0

onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Walk Lita to Mushroom with stepTo, then run the project: Mushroom prints \\"reached-target\\" when Lita gets there."
	Spotlight.reveal "api-references", "stepTo is the only block you need."
}

// The project printing the signal. Logs arrive for every print, so this
// callback is in no group: it filters first and only then starts a judging
// run. Output that is not the signal never touches the group and cancels
// nothing.
Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		judge("the project printed reached-target")
	}
}

// The project exiting. The whole callback is one run of judging, so an exit
// while an earlier judgement is still waiting cancels that judgement.
Editor.Runtime.onExit judging, code => {
	judge("the project exited")
}

// A Copilot round completing. Same group, so it cancels a judgement started
// by a log or an exit, and is cancelled by them in turn.
Copilot.onRoundComplete judging, round => {
	judge("the learner finished a Copilot round about: " + round.UserMessage)
}

// Hints are independent of judging. A policy given directly makes a private
// group for this callback alone: quick stops in a row show their hints one
// after another rather than as a pile of dialogs.
Editor.Runtime.onExit OneAtATime, code => {
	attempts++
	if attempts >= 3 {
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
	Spotlight.reveal "Code editor > Code text editor", "Write your code here"
	Spotlight.revealWith "Stage overview", "Watch Lita", SpotlightOptions{Mask: false, Duration: 3}
}

Editor.Runtime.onStart => {
	showMessage "Running!"
}

judging := newRunGroup(SkipWhileBusy)

Editor.Runtime.onExit OneAtATime, code => {
	echo "exit code", code
}

Editor.Runtime.onExit judging, code => {
	echo "judging exit", code
}

Copilot.onRoundComplete CancelPrevious, round => {
	echo "round", round.UserMessage
}

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		for sprite <- Editor.Project.listSprites() {
			echo Editor.Project.getCode(sprite)
		}
		Editor.CodeEditor.formatWorkspace
		Editor.Ruler.disable

		feedback := &Feedback{}
		Copilot.generateJSON "judge this", feedback
		completeWith Copilot.generateText("praise the learner")
	}
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
  }
]
