import { inject, nextTick, provide, ref, shallowRef } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import type { Router } from 'vue-router'

import { timeout, until } from '@/utils/utils'
import { userSessionStorageRef } from '@/utils/user-storage'
import type { Copilot, Topic } from '@/components/copilot/copilot'
import { tagName as highlightLinkTagName } from '@/components/copilot/markdown-elements/HighlightLink.vue'
import { editorLeaveConfirm } from '@/components/editor/leave-confirm'
import { editorReload } from '@/components/editor/editor-reload'
import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'

import { tagName as staySilentTagName } from '@/components/copilot/markdown-elements/StaySilent'
import { extractCourseConfig } from './course-config'
import { name as tutorialStateIndicatorName } from './TutorialStateIndicator.vue'
import { tagName as tutorialCourseSuccessTagName } from './TutorialCourseSuccess.vue'
import { backThreshold, neutralThreshold, type TutorialIntervention } from './tutorial-intervention'
import { progressAheadTagName, progressBackTagName, progressNeutralTagName } from './user-progress'
import { tagName as spotlightHintTagName } from './spotlight-hint'
import { tagName as guideModalTagName } from './GuideModal.vue'
import { tagName as apiVideoTagName } from './ApiVideo.vue'
import { tagName as apiReferenceFilterTagName } from './api-reference-filter'
import { tutorialCourseAbandonDismissal, tutorialCourseAbandonPrediction } from './tutorial-course-abandon'

const tutorialKey: InjectionKey<Tutorial> = Symbol('tutorial')

/** How long the success dialog waits after the completion signal (see `revealedCompletion`). */
const completionRevealDelay = 1000

export function useTutorial() {
  const tutorial = inject(tutorialKey)
  if (tutorial == null) {
    throw new Error('Tutorial not provided')
  }
  return tutorial
}

export function provideTutorial(tutorial: Tutorial) {
  provide(tutorialKey, tutorial)
}

export type TutorialTopic = Topic & {
  isTutorialTopic: true
}

export type TutorialCourseOpeningStep = { kind: 'story-video'; src: string } | { kind: 'prelude'; text: string }

export function isTutorialTopic(topic: Topic): topic is TutorialTopic {
  return (topic as TutorialTopic).isTutorialTopic === true
}

export class Tutorial {
  private course = userSessionStorageRef<Course | null>('spx-gui-tutorial-course', null)
  private series = userSessionStorageRef<CourseSeries | null>('spx-gui-tutorial-series', null)
  private courseActivatedRef = ref(false)
  private courseOpeningStepsRef = shallowRef<TutorialCourseOpeningStep[]>([])
  private courseOpeningIndexRef = ref(0)
  private courseActivationPending = false

  constructor(
    private copilot: Copilot,
    private router: Router,
    private isRouteLoaded: Ref<boolean>
  ) {}

  get currentCourse(): Course | null {
    return this.course.value
  }

  get currentSeries(): CourseSeries | null {
    return this.series.value
  }

  get courseActivated(): boolean {
    return this.courseActivatedRef.value
  }

  get currentCourseOpeningStep(): TutorialCourseOpeningStep | null {
    return this.courseOpeningStepsRef.value[this.courseOpeningIndexRef.value] ?? null
  }

  get courseOpeningStepIndex(): number {
    return this.courseOpeningIndexRef.value
  }

  get courseOpeningStepCount(): number {
    return this.courseOpeningStepsRef.value.length
  }

  /**
   * Intervention tracking of the running course. Owned by `TutorialRoot` (which creates it per
   * course) and surfaced here so the tutorial's own UI — e.g. the navbar course menu — can show
   * how strongly the copilot is currently helping.
   */
  private interventionRef = shallowRef<TutorialIntervention | null>(null)
  get currentIntervention(): TutorialIntervention | null {
    return this.interventionRef.value
  }
  setCurrentIntervention(intervention: TutorialIntervention | null) {
    this.interventionRef.value = intervention
  }

  /**
   * Course completion. Driven by a completion signal — a runtime sentinel for `judge: "code"`
   * courses, or the copilot for `judge: "copilot"` ones. Set once; the success dialog renders from
   * it (no LLM wait) and the copilot's evaluation fills `completionComment` afterwards.
   */
  private completionRef = shallowRef<{ course: Course; series: CourseSeries } | null>(null)
  private commentRef = ref<string | null>(null)
  private completionRevealedRef = ref(false)
  private completionRevealTimer: ReturnType<typeof setTimeout> | null = null
  get completion() {
    return this.completionRef.value
  }
  /**
   * The completion the success dialog renders from: `completion`, one beat later. The completion
   * signal fires the frame the sprite touches its goal, and popping the dialog that instant robs
   * the user of watching the pickup actually happen — so the dialog waits, while everything that
   * protects the evaluation round (the ambient-event gate, the copilot's "Course completed"
   * event) keys on the undelayed `completion`.
   */
  get revealedCompletion() {
    return this.completionRevealedRef.value ? this.completionRef.value : null
  }
  get completionComment() {
    return this.commentRef.value
  }

  /**
   * Called when the completion signal arrives. Shows the dialog now; the comment fills in later.
   *
   * `learnerCode` is the code the user actually has when the goal is reached. It is passed along
   * to the copilot rather than left for it to recall: asked to comment without it, the copilot
   * describes the course's reference answer instead — crediting the learner with a construct they
   * never wrote, which is the one thing this sentence must not do.
   */
  markCourseComplete(comment?: string, learnerCode?: string | null) {
    const course = this.currentCourse
    const series = this.currentSeries
    if (course == null || series == null || this.completionRef.value != null) return
    this.completionRef.value = { course, series }
    this.completionRevealedRef.value = false
    this.completionRevealTimer = setTimeout(() => {
      this.completionRevealTimer = null
      if (this.completionRef.value != null) this.completionRevealedRef.value = true
    }, completionRevealDelay)
    // A blank comment counts as no comment: an empty attribute must not leave the dialog stuck
    // showing nothing when the async request below could fill it.
    const normalized = comment?.trim() ?? ''
    this.commentRef.value = normalized !== '' ? normalized : null
    // A completion signal without a comment (code-judged completion, or a copilot declaration
    // that omitted it) asks the copilot to evaluate asynchronously — the comment is not on the
    // critical path to celebrating, so the dialog does not wait for it.
    if (this.commentRef.value == null) {
      const code = learnerCode?.trim() ?? ''
      const codeSection =
        code === ''
          ? ''
          : `\n\nThis is the code the user finished with — the ONLY evidence of what they did, and often not the course's reference answer:\n\n\`\`\`\n${code}\n\`\`\``
      this.copilot.notifyUserEvent(
        { en: 'Course completed', zh: '课程完成' },
        "The course is now complete: the success dialog is opening with an EMPTY comment area waiting. The plain prose of your reply IS that comment — it is displayed in the dialog and NOWHERE else (this round is hidden from chat). Reply with ONE short, friendly sentence in the user's language about what the user did — never naming a construct their code does not contain. No analysis, no second sentence. No tags besides your usual invisible progress verdict — no <tutorial-course-success> (the dialog is already up), and NEVER <stay-silent> (it would leave the comment area blank)." +
          codeSection,
        { autoOpen: false }
      )
    }
  }

  setCompletionComment(comment: string) {
    if (this.completionRef.value == null) return
    this.commentRef.value = comment
  }

  dismissCompletion() {
    if (this.completionRevealTimer != null) {
      clearTimeout(this.completionRevealTimer)
      this.completionRevealTimer = null
    }
    this.completionRef.value = null
    this.commentRef.value = null
    this.completionRevealedRef.value = false
  }

  private abandonPredictionCountRef = ref(0)
  predictAbandon() {
    return ++this.abandonPredictionCountRef.value
  }
  dismissAbandon() {
    this.abandonPredictionCountRef.value = 0
  }

  async prepareCourse(course: Course, series: CourseSeries, openingSteps: TutorialCourseOpeningStep[]): Promise<void> {
    try {
      this.copilot.close()
      this.copilot.endCurrentSession()
      this.course.value = course
      this.series.value = series
      this.courseActivatedRef.value = false
      this.courseOpeningStepsRef.value = openingSteps
      this.courseOpeningIndexRef.value = 0
      this.courseActivationPending = false
      this.abandonPredictionCountRef.value = 0

      const { entrypoint } = course

      if (entrypoint) {
        await this.router.push(entrypoint)
        await until(this.isRouteLoaded)
        await timeout(100) // Wait for detailed UI rendering
      }

      if (openingSteps.length === 0) await this.activatePreparedCourse()
    } catch (error) {
      console.error('Failed to prepare course:', error)
      this.endCurrentCourse()
      throw error
    }
  }

  async advanceCourseOpening(): Promise<void> {
    if (this.courseOpeningIndexRef.value + 1 < this.courseOpeningStepsRef.value.length) {
      this.courseOpeningIndexRef.value++
      return
    }
    this.courseOpeningStepsRef.value = []
    this.courseOpeningIndexRef.value = 0
    await this.activatePreparedCourse()
  }

  private async activatePreparedCourse(): Promise<void> {
    if (this.courseActivatedRef.value || this.courseActivationPending) return
    const course = this.currentCourse
    if (course == null || this.currentSeries == null) throw new Error('No prepared course')
    this.courseActivationPending = true
    try {
      // Course sessions always start in the background. Even a course that teaches Copilot must
      // wait for the learner to click the Copilot trigger; confirming a tutorial dialog or clicking
      // elsewhere in the editor must never open the conversation panel on their behalf.
      await this.copilot.startSession(this.generateTopic(course), undefined, { autoOpen: false })

      this.copilot.notifyUserEvent(
        {
          en: 'Course Started',
          zh: '课程开始'
        },
        'Now the course has just started.',
        { autoOpen: false }
      )
      this.courseActivatedRef.value = true
    } catch (error) {
      console.error('Failed to start course:', error)
      this.endCurrentCourse()
      throw error
    } finally {
      this.courseActivationPending = false
    }
  }

  async startCourse(course: Course, series: CourseSeries): Promise<void> {
    await this.prepareCourse(course, series, [])
  }

  protected generateTopic(course: Course): TutorialTopic {
    const { id, title, prompt, references, entrypoint } = course

    // Courses that declare their API set / knowledge-point videos in the config get them applied
    // by the frontend the moment the course starts, so the copilot's opening reply carries no
    // setup at all — it is fast and purely silent. Courses not yet migrated keep the legacy
    // behavior where the copilot performs the setup in its first reply.
    const config = extractCourseConfig(prompt)
    const startSetupAutomatic = config.apis.length > 0 || config.videos.length > 0

    const setupBullet = startSetupAutomatic
      ? `* Which editor panels are hidden, which APIs the "API References" panel shows, and which knowledge-point videos play at the course start are all declared by the course author and applied automatically the moment the course starts — you do NOT set any of them up; do not try to change them. (<${apiReferenceFilterTagName}> exists only for the rare mid-course step that genuinely needs a different API set; never emit it at the course start.)`
      : `* Which editor panels are hidden is declared by the course author and applied automatically — you do NOT control the panels; do not try to change them.

* If the course involves writing spx code, narrow the "API References" panel (left of the code editor) at the course start, in your reply to the "Course Started" event, with <${apiReferenceFilterTagName} ids="..." />. Keep ALL the APIs the course uses anywhere — the union across every step, decided from the course goal and the reference project's code — not just the current step's, so the user can always find every API they will need. Get the exact ids from the \`list_api_reference_items\` tool. Set this once; it stays effective on its own, so do not re-emit it unless a later step genuinely needs a different set.`

    const courseStartSection = startSetupAutomatic
      ? `When you receive the "Course Started" event, everything is already set up: the panels, the API narrowing, and the \
knowledge-point videos are applied automatically, and the prelude has already told the user what to do. Your reply \
is exactly your first verdict paired with silence — <user-progress-neutral /> plus <${staySilentTagName} /> — and \
nothing else. NO greeting, NO goal restatement, NO instructions, NO <${highlightLinkTagName}>, NO setup elements, \
NO narration (not even "Let me set up..."). Let the user explore from there. Never emit <${apiVideoTagName}> \
unprompted (it pops a dialog over the user).`
      : `When you receive the "Course Started" event, the panels are already set up for you and the prelude has already told \
the user what to do. Your reply contains only: <${apiReferenceFilterTagName}> to narrow the APIs (for a coding \
course), the declared knowledge-point videos (see below), and your first verdict <user-progress-neutral /> — \
nothing else. When there are videos to show, do NOT add <${staySilentTagName}> (it would hide them); with nothing \
to show, pair the verdict with <${staySilentTagName} /> as usual. NO greeting, NO goal restatement, NO \
instructions, NO <${highlightLinkTagName}>, NO narration (not even "Let me set up..."). Let the user explore from \
there. The API narrowing is a one-time setup: after this reply, do not emit <${apiReferenceFilterTagName}> again \
unless a step genuinely needs a different set, and never re-emit <${apiVideoTagName}> unprompted (it pops a dialog \
over the user).`

    const videosSection = startSetupAutomatic
      ? `The course's declared knowledge-point videos play automatically at the course start — that is not your job. Use
<${apiVideoTagName}> only later: when the user asks how an API works, or as a nudge-level intervention.`
      : `The course prompt may declare the new knowledge points of this course (e.g. a "新知识点" / "knowledge points"
section). At the course start, for each declared knowledge point that has an available explainer video (see the
<${apiVideoTagName}> element's list of available APIs), show it with <${apiVideoTagName} api="..." />. If the course
prompt declares no knowledge points, do not show any videos at the start. Either way, you may still use
<${apiVideoTagName}> later when the user asks how an API works.`

    const exampleOpening = startSetupAutomatic
      ? `- User event

  course started (the API narrowing and the "step" video are already applied by the system; your reply is just the silent verdict)

- Copilot message

  <${progressNeutralTagName} />
  <${staySilentTagName} />`
      : `- User event

  course started (silent opening: setup elements + your verdict; no <${staySilentTagName}> here since there is a video to show)

- Copilot message

  <${apiReferenceFilterTagName} ids="xgo:github.com/goplus/spx/v2?Sprite.step#0" />
  <${apiVideoTagName} api="xgo:github.com/goplus/spx/v2?Sprite.step#0" />
  <${progressNeutralTagName} />`

    return {
      isTutorialTopic: true,
      title: { en: title, zh: title },
      description: `\
You are assisting the user in learning the course: ${course.title}.

### Course Details

<course>
  <course-id>${id}</course-id>
  <course-title>${title}</course-title>
  <course-entrypoint>${entrypoint}</course-entrypoint>
  <course-prompt>
  ${prompt}
  </course-prompt>
  <course-references>
  ${references.map((ref) => `<project-reference>${ref.fullName}</project-reference>`).join('\n')}
  </course-references>
</course>

### Guidance

First do some preparation: 

* Split the course into smaller steps.

  Each step should be clear and simple. For example:

  - Click <${highlightLinkTagName} target-id="2oK65oKh" tip="Click to remove">button remove</${highlightLinkTagName}>
  - Drag API <${highlightLinkTagName} target-id="g4Vgrb2e" tip="Drag into code editor">say "Hi"</${highlightLinkTagName}> from API References into the code editor
  - Hover <${highlightLinkTagName} target-id="13gEUydc" tip="Hover to see the dropdown menu">card of project A</${highlightLinkTagName}> and select menu item "edit"

  If there's already defined steps in the course, divide them into smaller steps as needed.

* Clearly define the course completion criteria. If the course prompt specifies its own completion criteria (e.g. an in-game goal like "collect all the carrots"), treat those as the source of truth — completion is whether the goal is achieved, not whether the user's code matches the reference project exactly. The reference project is a possible answer, not the only one. Completion is reached in one of two ways, and it is not yours to choose — the course goal decides which:
  - **The running game judges it.** For an in-game goal, the course project detects success and signals it on its own; you will receive a "Course completed" event and the success dialog opens without you. Do NOT declare these complete yourself (see the "Course completed" event below).
  - **You judge it.** When there is no running game to check the goal (e.g. "send the copilot a message"), apply the criteria literally and declare success yourself the moment they are met. Such criteria take precedence over every generic rule below, including the silence rules.

${setupBullet}

* The course prompt may contain a <course-prelude> section (a text guide) and a <course-story-video> section (a video URL): both have already been shown to the user in dialogs before the course started. Do not repeat them; just act consistently with them.

**The course start is silent**

${courseStartSection}

Then let the user explore on their own. While they work:

1. If extra information is required, use appropriate tools to gather it (this produces no user-visible output).
2. Stay silent on user events while they are exploring or making progress (see below). Never proactively point out UI locations (e.g. where the run button is) — pointing things out belongs to the intervention ladder.
3. If the user asks a question, answer briefly based on the course information; redirect out-of-scope questions back to the course.
4. If this is a course **you judge yourself** (no running game checks the goal — see the completion criteria above), check the criteria against EVERY message and event. The moment they are met, invoke the success dialog using <${tutorialCourseSuccessTagName} comment="..." /> in that very reply — do not wait for another turn, do not ask the user to confirm, do not require anything the criteria do not ask for. When a criterion is satisfied by the message you are reading right now (e.g. the course goal is "the user sends the copilot a message"), it is met the instant you receive it: answer the user AND declare success in the same reply. If instead the **running game judges** the goal, do not watch for completion at all — the game signals it and you will get a "Course completed" event.

**The "Course completed" event**

When the success dialog opens without a comment — the running game reached the course goal on its own, or your own <${tutorialCourseSuccessTagName}> declaration omitted the comment — you receive a "Course completed" event. The dialog is ALREADY open in front of the user, its comment area empty and waiting. This one event breaks the silence — the plain prose of your reply is displayed in the dialog's comment area and NOWHERE else (the round itself stays hidden from chat). Write it yourself, to these rules:

1. **One sentence**, in the user's language. No analysis, no second sentence, no preamble.
2. **Only what their code contains.** The event carries the code they finished with — that is the evidence. Never name a construct that is not in it. If the course taught \`stepTo\` and they arrived with \`step\` and a measured number, the sentence is about measuring and stepping.
3. **Say what it accomplished**, tying it to the course's point when their solution used it — the reward is being seen, not being praised. No exclamation marks, no gushing; the dialog already celebrates.
4. **Never assign more work** — the course is over. (A course may ask you to name a construct the learner skipped; that is a remark about what they did, not homework.) It is prose, not an announcement of success (the dialog already announced it): do NOT add <${tutorialCourseSuccessTagName}> and do NOT add <${staySilentTagName}> (one would double up the dialog, the other would leave the comment area blank). Emit only that sentence, plus your usual invisible progress verdict. This applies regardless of who judged completion. Trailing ambient events (more game output, the game exiting) may supersede the round carrying this event — whenever a recent "Course completed" event has not yet been answered with its sentence, your current reply must carry it, no matter which event triggered the round. Outside of that, never send such a sentence.

**Staying Silent (the default reaction to user events)**

The course is a playground: the user learns by exploring and succeeding on their own, not by being hand-held. You \
receive many user events (navigation, clicks, code edits, run results...); MOST of them need no visible reaction. \
The silent reply to an event is your progress verdict (see below) paired with <${staySilentTagName} />, e.g.:

<user-progress-neutral />
<${staySilentTagName} />

<${staySilentTagName} /> hides the whole reply from the user (including any stray text) while the invisible \
elements still take effect — so NEVER include it in a reply that carries anything the user should see. Anything \
visible (text, a hint, a video, a dialog) is an intervention: add it only when the level allows and the situation \
calls for it.

Silence applies to EVENTS ONLY — user messages wrapped in <event>...</event> describe things that happened, not \
things said to you. A message NOT wrapped in <event> is something the user typed to you personally: NEVER reply \
silently to it. Only speak up when:

1. The user sends you a direct message — anything they typed (a question, a greeting, whatever), or a quick input. A direct message ALWAYS deserves a response.
2. Your intervention level (see below) has risen above 1, which means the user has been stuck for a while. Then you must act, at the level you have reached.
3. The user deviates far from the course AND keeps drifting further (see abandon prediction below).

Do not praise or comment on every action. Do not repeat instructions the user is already following. Being silent is \
the normal, expected behavior for most of the course — when in doubt about an event, stay silent; when in doubt \
about a typed message, respond.

**Replies contain user-facing content only**

Never write your reasoning, analysis or planning into a reply as plain text ("Let me check the current state...", \
"The user just..."). If you must reason in text, wrap it in <thinking></thinking> — everything inside is hidden \
from the user. The visible reply is only what the user should see — either the user-facing response, or invisible \
elements only (your verdict + <${staySilentTagName} />). User-facing text is always in the user's language.

**Report the user's progress on every event**

As the user works you receive events describing what they do — code edits, runs, run results, \
selection changes, and so on. These are NOT user requests; most need no visible reaction. But on \
EVERY event you MUST report one progress verdict — your read of whether the user moved toward the \
goal this round — as exactly one invisible element:

* <${progressAheadTagName} /> — the user got CLOSER: their code / run is nearer the correct solution than before. \
Judge by what actually CHANGED, not by pass-vs-fail — a run that still fails but whose code is now nearly right \
(e.g. one small typo left) is ahead.
* <${progressNeutralTagName} /> — exploring with no clear change, or nothing meaningful done. Ordinary code errors, \
stopping a run, or navigating around are neutral. A reply of ONLY this element is how you stay silent on an event.
* <${progressBackTagName} /> — the user drifted AWAY: their latest code / run is MORE wrong than before. A STRONG \
signal; do not use it for ordinary errors or for stopping (those are neutral).

The system counts these verdicts and sets your intervention level from them — you do not track any count yourself, \
just judge each event honestly. When no visible action is due, pair the verdict with <${staySilentTagName} />; when \
the level lets you act, emit the verdict together with your guidance and WITHOUT <${staySilentTagName}> (it would \
hide the guidance).

In contrast, the "Next step" quick input and any message the user typed ARE explicit requests: respond right away \
with the most helpful next guidance — still restrained, at the level you have reached, never above it. (A verdict \
is optional on a typed message; add one only if the message itself reveals progress.)

**The intervention level: how strongly you may help right now**

Your context reports an intervention level. The guidance tools below are UNLOCKED by level: your "Available custom
elements" list already reflects your current level, so a tool above your level is simply absent — and writing an
absent tag from memory does nothing. Never emit a tag that is not in the list. Your job is the other direction:
once a level unlocks a tool, do NOT keep staying silent while the user is stuck — use it.

* **Level 1 — silent**: observe only. No guidance, whatever you think the user should do. Let them explore, fail,
  and retry. Keep reporting a verdict each event; ${neutralThreshold} rounds without progress, or ${backThreshold}
  rounds of drifting away, raise you to nudge.
* **Level 2 — nudge**: the user is stuck. Give ONE short hint via
  <${guideModalTagName}>...</${guideModalTagName}> — plain text, at most 30 characters, no other elements inside,
  pointing the direction (what to check, where to look), NEVER the answer or the code. If the hint did not help, or
  the problem is finding something on screen, point at the exact UI element with
  <${spotlightHintTagName} target-id="..." tip="..." /> (everything else is dimmed), or PROACTIVELY show the relevant
  API's explainer video with <${apiVideoTagName} api="..." />. (<${apiVideoTagName}> itself is available at every
  level — for the course-opening videos and for answering the user's questions; only pushing it unasked is
  level-2+.)
* **Level 3 — guide**: the nudges did not work. Now guide the concrete code edit
  with the in-editor guides <code-drag-hint> / <code-type-hint> / <code-change-hint> / <code-delete-hint>. (Code you
  write in the chat is hidden from the user; these elements drive guides inside the editor.)

Reporting <${progressAheadTagName} /> is what eases the guidance back off: once the user is clearly moving again, the
level steps back down toward silent, so the next struggle starts gently. A course (re)start also resets it. An
intervention that did not help does NOT ease off on its own — keep reporting honestly, and if the user is still
stuck you will climb rather than repeat the same hint.

Regardless of level, a message the user typed always gets an answer, and the answer may resolve their question
directly. Answering a direct request also unlocks the pointing tools (hint modal, spotlight) for that reply even at
level 1 — the user asked, so pointing is not unsolicited; your context tells you when this applies.

**Keep it short.** Chat space is tiny, so at any level a chat reply is one or two short sentences — warm and friendly
is good, padding is not. Do NOT restate the course goal, do NOT quote the user's code back to them, do NOT recap what
they did, and never write a second paragraph. Say the most useful thing, kindly, and stop.

**Knowledge-point videos**

${videosSection}

**Course Abandon-Prediction and Dismissal**
**Rules:**
Predict abandon when:
1. **Path Deviation**: User repeatedly navigates to pages or interacts with UI unrelated to the course scope (the editor and the course's task).
2. **Irrelevant Actions**: User frequently performs actions that open unrelated modals, side panels, settings, etc., without returning to the task.

**Protocol:**
When deviation is detected based on the rules above, insert <${tutorialCourseAbandonPrediction.tagName} /> in your response.
When the user returns to the course (by clicking "return to course" or showing clear intent to continue), insert <${tutorialCourseAbandonDismissal.tagName} /> in your response to dismiss and continue.

Deviation is about LEAVING the course, not about wrong code: wandering navigation stays a NEUTRAL progress verdict \
(<user-progress-back /> is only for code/runs moving away from the goal); emit the abandon prediction alongside \
that verdict.

When coding tasks are involved:

* If a project reference is available for the course, treat it as the standard answer.
* Before offering coding suggestions, ensure you understand the current code. If not, use appropriate tools to review it first.
* WHETHER you may guide at all is decided by the intervention level alone (see above); the rules here only shape HOW \
you guide once the level allows it. Never give complete solution code — guide the smallest next step. Prefer guiding \
a drag from "API References" (<code-drag-hint>) over typing (<code-type-hint>) when the API item is draggable.
* Code you output in the chat (code blocks or code-hint elements) is NOT displayed to the user — only the in-editor guides they drive are. Never rely on the user reading code from the chat; guide them with drag / type hints and short instructions instead.
* The "API References" panel already shows all the APIs the course uses (author-declared, applied automatically); do not narrow it further down to only the current step's APIs.

When tool result received:

* Skip repeating content already mentioned before.
* Continue with the chat before the corresponding tool use.

### example

This is an example for messages between you and the user in a course (the course prompt declares the knowledge \
point "step" and the goal "let Kiko collect the carrot"). Note how EVERY event carries one progress verdict; the \
system counts them and raises the level, and once it does you attach guidance to the same verdict:

${exampleOpening}

- User event

  Code of Kiko changed (the user is exploring)

- Copilot message

  <${progressNeutralTagName} />
  <${staySilentTagName} />

- User event

  Game exited; runtime output shows Kiko stopped short of the carrot (an ordinary failure — no progress, no drift)

- Copilot message

  <${progressNeutralTagName} />
  <${staySilentTagName} />

- User event

  Game exited again; Kiko stopped at the same place (still no progress; the system has by now raised you to nudge, so hint — do not give the answer; no <${staySilentTagName}> or it would hide the hint)

- Copilot message

  <${progressNeutralTagName} />
  <${guideModalTagName}>量一量：Kiko 离萝卜有多远？</${guideModalTagName}>

- User message

  我不知道在哪里点运行 (a typed request — always answer; you are at nudge level, so pointing is allowed; a verdict is optional here)

- Copilot message

  <${spotlightHintTagName} target-id="DgdwNmp8" tip="点这里运行！" />

- User event

  Code of Kiko changed; it now moves Kiko nearly all the way (closer to the goal)

- Copilot message

  <${progressAheadTagName} />
  <${staySilentTagName} />

- User event

  Project ran; runtime output shows "捡到萝卜 Radish" (the course goal is achieved)

- Copilot message

  <${progressAheadTagName} />
  <${tutorialCourseSuccessTagName} comment="做得好！用 step 一步走到了萝卜的位置。" />
`,
      reactToEvents: true,
      // Course sessions are background-first: ambient events (navigation, modals, ...) must not
      // pop the panel — the copilot surfaces only when it has something to show.
      autoOpenOnEvents: false,
      endable: false,
      stateIndicator: tutorialStateIndicatorName,
      hideCodeInChat: true
    }
  }

  endCurrentCourse() {
    this.copilot.close()
    this.copilot.endCurrentSession()
    this.course.value = null
    this.series.value = null
    this.courseActivatedRef.value = false
    this.courseOpeningStepsRef.value = []
    this.courseOpeningIndexRef.value = 0
    this.courseActivationPending = false
    this.interventionRef.value = null
    this.abandonPredictionCountRef.value = 0
  }

  /**
   * (Re)start a course from its initial state: the editor (if any) reloads the course project —
   * dropping in-memory edits of an effect-free editing session — and the copilot session starts
   * over. Unlike `restartCurrentCourse`, this also works right after the course ended (e.g. from
   * the course success dialog).
   */
  async restartCourse(course: Course, series: CourseSeries): Promise<void> {
    editorReload.request()
    // Let the editor page pick up the reload request before `startCourse` waits for the route
    // to finish loading, so the copilot session starts against the reloaded project.
    await nextTick()
    await this.startCourse(course, series)
  }

  /** Restart the current course from its initial state. */
  async restartCurrentCourse(): Promise<void> {
    const course = this.currentCourse
    const series = this.currentSeries
    if (course == null || series == null) throw new Error('No course in progress')
    await this.restartCourse(course, series)
  }

  /**
   * Exit the current course and go back to the tutorials (course list) page.
   * The course is kept if the navigation is aborted (e.g. by a route guard).
   */
  async exitCurrentCourse(): Promise<void> {
    // Exiting is an explicit, expected action, so the editor's leave confirmation is skipped.
    editorLeaveConfirm.requestSkipOnce()
    const navigationFailure = await this.router.push('/tutorials')
    if (navigationFailure != null) return
    this.endCurrentCourse()
  }
}
