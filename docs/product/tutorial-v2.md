# User Tutorial (New Course System)

> This document revises and extends the [existing User Tutorial design](./tutorial.md): the existing Copilot-driven guiding approach is kept as one of two course types (Guided Course), while this document introduces the Playground Course type.

## Background

The existing User Tutorial is centered on the Copilot: a course is a Prompt (Markdown-as-course), and the Copilot guides the user through operations step by step. This approach serves two needs at once:

1. Onboarding for Builder as an IDE (Product Tour)
2. (Game-based) programming education

In course practice we found that for need 2, "step-by-step guidance" has inherent shortcomings:

* **Learners do not need to think.** A guided course breaks the task into itemized instructions, and learners merely execute them: "click here", "change this line to that" — they can even copy the answer code or apply it with one click. However smoothly the instructions are executed, this builds no understanding of the concepts, let alone the ability to apply them elsewhere.
* **No room for exploration.** There is a single path, and every deviation gets corrected. Learners never get to experiment, yet the "try–observe–revise" loop is the core cycle of learning to program — and where the fun lies.
* **Over-reliance on the LLM.** Every step forward requires the LLM, which brings cost, latency, and uncertainty. The course experience depends on how the model performs each time; creators cannot precisely control pacing or judging, and two runs of the same course may differ significantly.

The conclusion: **two kinds of teaching scenarios call for two course types**:

* Product-operation teaching (non-coding): the operation path is unique by nature, so step-by-step guidance is the right form → **Guided Course**
* Programming teaching (coding): thinking and exploration are required, so give goals, not steps → **Playground Course**

## The Two Course Types

|  | Guided Course | Playground Course |
| --- | --- | --- |
| Driven by | Copilot guiding step by step per Prompt | Course code |
| Teaching object | Builder UI operations | The course project (a game world to reshape) |
| Where | Unbound — all of Builder is the stage | The project editor |
| What learners do | Follow instructions | Explore freely in a prepared scene to reach the goal |
| Completion judging | Judged by the Copilot (aided by the game-exit signal) | Judged by course code (runtime signals, code checks, LLM completion) |
| LLM dependence | Strong (involved at every step) | Weak (invoked by course code as needed) |
| Typical scenarios | Product usage teaching, asset operations | Teaching programming concepts |
| What creators produce | A Prompt | Course code + course project + course assets |

The two types target different scenarios, but the choice belongs to the course creator: in theory a coding course can also be built in the guided form (e.g., walking through the very first line of code hand in hand).

The two types are supported by separate mechanisms; we do not build a unified abstraction over them.

## Basic Concepts

### Course & Course Series

Course remains the core teaching unit, made up of three parts: **metadata + type + content**.

* **Metadata**: Title, Thumbnail, etc., unchanged from the existing design
* **Type**: Guided / Playground; determines the form of the content and how the course is driven
* **Content**: for a Guided Course, a Prompt (Markdown-as-course) + entry URL; for a Playground Course, course data (course code + course project + course assets)

The essential difference between the two types: **a Guided Course teaches "operating Builder" — its object is the UI, so it is not bound to a place: the homepage, the editor, or the community pages can all be its stage; a Playground Course teaches "reshaping a world" — its object is the course project, so it always takes place in the project editor**.

One boundary that is easy to confuse: the distinction lies in "who drives the flow", not "whether an LLM is used". A Playground Course may well invoke LLM capabilities (judging expression-type goals, generating personalized feedback) and still be a Playground Course — its flow (opening, running, completion) is driven entirely by course code.

A Course Series organizes a set of Courses into an ordered series, carrying course order and "next course" progression. Courses within one series share the same type; mixing types within a series is not supported for now.

Course Gallery and Course Admin remain as designed.

### Playground Course

Every Playground Course is associated with exactly one project, and entering the course means entering the project editor. All behavior of the course is expressed and driven by **course code**; there is no separate declarative configuration layer.

#### Course Data

* **Course code**: written on top of the class framework; it orchestrates the entire course flow — opening, judging, completion — by invoking the atomic capabilities provided by the framework (see below). A typical course is just a handful of direct calls to these capabilities; a complex course can implement arbitrary orchestration and judging logic.
* **Course project**: a game project built by the creator in advance — stage, sprites, and scene code. The project is part of the course data; it is not saved or published independently. The scene code serves two purposes: forming an interesting, explorable world (where the learner's changes produce visible feedback), and printing completion signals (specific log lines) at key events for the course code to judge.
* **Course assets**: assets referenced by the course, such as explainer videos, also part of the course data. (A shared asset library, allowing multiple courses to reuse the same asset, may be provided in the future.)

A learner's modifications to the course project exist only within the current learning session; they affect neither the course itself nor other learners. Learners can save their results as a project of their own.

#### Atomic Capabilities

The framework provides course code with the following atomic capabilities, to be invoked and combined as needed:

* **Messaging**: show text to the learner in a dialog (Markdown supported), play a video, or spotlight a UI element with a hint; dialogs and videos always wait for the learner to confirm or finish watching before the course continues, while spotlight highlights never block the course flow and are dismissed by the learner's next click
* **Runtime signals**: listen to the game's run logs. This is the main judging channel: as long as a program is running, it can always `println` to the console — the scene code prints specific logs at key events, and the course code waits for these signals to learn *what the learner accomplished*
* **Code check**: deterministically check whether specified constructs appear in the learner's code, to learn *how the learner accomplished it*
* **LLM completion**: make a single generation request to the LLM and get the result back, automatically carrying context such as course information and XGo/spx knowledge (these requests do not appear in the learner's conversation with the Copilot). Useful for judging "expression-type" goals (e.g., have the character say a greeting — anything counts) or for generating personalized feedback based on the learner's actual code
* **Completion**: `complete` / `completeWith <one-line feedback>` ends the course and shows the completion dialog; the learner can proceed to the next course or return to the course list

The judging principle: **judge structured results with code**. A course scene's state transitions should converge to a unique, deterministic final state — "done" corresponds to a definite state that a program can check; LLM completion covers what structured judging cannot: expression-type goals and feedback generation.

#### Editor Capabilities

Editor customizations a course can enable on demand — independent of each other and freely combinable:

* **Simple mode**: a focused form for single-sprite programming — hides the sprite list and disables sprite settings; sprite names appear on the stage (hovering a sprite reveals its name label, clicking inserts the name into the code, so learners never have to spell sprite names); larger code font; centered run button and Copilot entry; a bigger API Reference. The running state does not exit automatically — learners switch back themselves, encouraging rapid "change a little, run again" iteration
* **API allowlist**: filters the API Reference to show only the APIs relevant to the course and hides unrelated categories, reducing cognitive load
* **Ruler**: a measuring aid on the stage that helps learners build intuition for coordinates and distances

### Guided Course

Follows the [existing design](./tutorial.md): a course is a Prompt; the Copilot drives step-by-step guidance, actively perceiving user operations and Builder events (with a "Continue" button as an aid for the few events that are hard to perceive), assisted by the game-exit signal for judging. Revisions:

* Improve the output after passing: once passed, wrap up — no further guidance
* The problem of "the learner forgets to exit the course while the Copilot keeps perceiving and chatting" gets no systematic solution: rely on the existing deviation detection, optionally adding a time limit (expiry reminder)

### The Copilot's Role

The Copilot is positioned differently in the two course types:

|  | Guided Course | Playground Course |
| --- | --- | --- |
| Position | Driver: actively guides step by step | Assistant: on standby |
| Trigger | Starts on course entry and keeps pushing forward | The learner asks for help |
| Duties | Highlight UI, perceive events, judge completion | Answer questions; provide the LLM completion capability to course code |

In Playground Courses, the Copilot's answers must not do the task for the learner: copying code blocks and one-click apply (code-block copy / code-change apply) are disabled within courses, so learners cannot bypass thinking and paste in the answer.

## User Story

### Learner: completing the Playground Course "Click the Target"

* The learner enters the course; the editor opens the course project in simple mode: Lita and a mushroom on the stage
* The opening proceeds: a dialog states the task ("Get Lita to the mushroom") → the `stepTo` explainer video plays
* The learner experiments: first tries `step 200` and sees Lita overshoot; changes it to `step 150` — closer, but off target
* The learner gets a successful run (the scene code detects Lita touching the mushroom and prints the completion signal), but the code does not use `stepTo`, which this course requires — the course prompts a retry: "Try clicking the mushroom on the stage and let Lita walk right up to it in one step"
* The learner hovers over the mushroom, clicks the revealed name label to insert `Mushroom` into the code, writes `stepTo Mushroom`, and passes
* The completion dialog appears with one line of feedback generated from the learner's final code: "You used stepTo to walk Lita right up to the mushroom." The learner proceeds to the next course or returns to the course list

Throughout, the learner can summon the Copilot with questions at any time; it answers, but neither intervenes on its own nor hands out ready-to-paste answers.

### Creator: building the Playground Course "Click the Target"

* Build the course project: place Lita and the mushroom; in the mushroom's scene code, detect being touched and `println` the completion signal
* Write the course code, orchestrating the flow with atomic capabilities:

	- Opening: show the task description, play the `stepTo` explainer video (a course asset)
	- Wait for the completion signal; on arrival, check whether the learner's code uses `stepTo` — if not, prompt a retry; if so, generate feedback and complete:

		```
		word := llm.getCompletion("In one sentence, describe what this code accomplished: ...")
		completeWith word
		```

	- Enable editor capabilities: simple mode; an API allowlist showing only `stepTo` and previously learned APIs
* Preview in the Course Editor, running through the whole flow from the learner's perspective
* Once tests pass, publish and add the course to its Course Series

### Learner: completing the Guided Course "Create a Project"

Same as the [User Stories in the existing document](./tutorial.md#user-stories): the Copilot guides the learner to the entry, highlights UI elements, and wraps up the session once creation completes.

## Course Authoring

* **Course Editor**: the editing entry for courses and course series. For Playground Courses it edits the course data (course project, course code, course assets); for Guided Courses it edits the Prompt; at the series level it manages course order and metadata
* **Course Preview**: runs the real course flow from a learner's perspective (rather than a separate simulation), supporting single-course preview and whole-series walkthroughs; changes made during preview are not written back into the course data
* Course data can be exported and imported, fitting different authoring workflows such as local editing
