import { inject, nextTick, provide, ref } from 'vue'
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
import { name as tutorialStateIndicatorName } from './TutorialStateIndicator.vue'
import { tagName as tutorialCourseSuccessTagName } from './TutorialCourseSuccess.vue'
import { tagName as workspaceHiddenAreasTagName } from './workspace-hidden-areas'
import { tagName as apiReferenceFilterTagName } from './api-reference-filter'
import { tagName as spotlightHintTagName } from './spotlight-hint'
import { tagName as guideModalTagName } from './GuideModal.vue'
import { tagName as apiVideoTagName } from './ApiVideo.vue'
import { tutorialCourseAbandonDismissal, tutorialCourseAbandonPrediction } from './tutorial-course-abandon'

const tutorialKey: InjectionKey<Tutorial> = Symbol('tutorial')

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

export function isTutorialTopic(topic: Topic): topic is TutorialTopic {
  return (topic as TutorialTopic).isTutorialTopic === true
}

export class Tutorial {
  private course = userSessionStorageRef<Course | null>('spx-gui-tutorial-course', null)
  private series = userSessionStorageRef<CourseSeries | null>('spx-gui-tutorial-series', null)

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

  private abandonPredictionCountRef = ref(0)
  predictAbandon() {
    return ++this.abandonPredictionCountRef.value
  }
  dismissAbandon() {
    this.abandonPredictionCountRef.value = 0
  }

  async startCourse(course: Course, series: CourseSeries): Promise<void> {
    try {
      this.copilot.endCurrentSession()
      this.course.value = course
      this.series.value = series
      this.abandonPredictionCountRef.value = 0

      const { entrypoint } = course

      if (entrypoint) {
        await this.router.push(entrypoint)
        await until(this.isRouteLoaded)
        await timeout(100) // Wait for detailed UI rendering
      }

      await this.copilot.startSession(this.generateTopic(course))

      this.copilot.notifyUserEvent(
        {
          en: 'Course Started',
          zh: '课程开始'
        },
        'Now the course has just started.'
      )
    } catch (error) {
      console.error('Failed to start course:', error)
      this.endCurrentCourse()
      throw error
    }
  }

  protected generateTopic(course: Course): TutorialTopic {
    const { id, title, prompt, references, entrypoint } = course
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

* Clearly define the course completion criteria. If the course prompt specifies its own completion criteria (e.g. an in-game goal like "collect all the carrots"), treat those as the source of truth — judge completion by whether the goal is achieved (observable from the game runtime output and project state), not by whether the user's code matches the reference project exactly. The reference project is a possible answer, not the only one.

* If the course involves writing spx code, proactively narrow the "API References" panel (left of the code editor) at the start, before guiding the first coding step. Keep ALL the APIs the course uses anywhere — the union across every step, decided from the course goal and the reference project's code (the standard answer) — not just the current step's APIs, so the user can always find every API they will need throughout the course. Set this once and keep it stable for the whole course; only change it if the course genuinely needs a different set. This is expected for every coding course — do not wait for the user to ask.

* Reduce workspace distraction at the start of the course: hide the editor workspace areas the course does not need using <${workspaceHiddenAreasTagName} areas="..." />. For a typical coding course hide all of them: <${workspaceHiddenAreasTagName} areas="editor-panels,edit-mode-switch,preview-header,code-editor-tools" />. Keep an area visible only when some step of the course needs it (e.g. keep \`editor-panels\` if the user must manage sprites, sounds or the stage). If the course prompt itself specifies which areas to hide or keep, follow it. If a later step needs a hidden area, re-emit the element with an updated list; use areas="" to show everything again. Like the API narrowing, decide this once at the start — do not wait for the user to ask.

* The course prompt may contain a <course-prelude> section: its content has already been shown to the user in a dialog before the course started. Do not repeat it; just act consistently with it.

**The course start is silent setup**

When you receive the "Course Started" event, your reply must contain ONLY the invisible setup elements (workspace \
hiding, API narrowing) plus the declared knowledge-point videos (see below) — no greeting, no goal restatement, no \
instructions, no <${highlightLinkTagName}>. The prelude dialog has already told the user what to do; let them \
explore from there.

Then let the user explore on their own. While they work:

1. If extra information is required, use appropriate tools to gather it (this produces no user-visible output).
2. Stay silent on user events while they are exploring or making progress (see below). Never proactively point out UI locations (e.g. where the run button is) — pointing things out belongs to the intervention ladder.
3. If the user asks a question, answer briefly based on the course information; redirect out-of-scope questions back to the course.
4. When the completion criteria are met, invoke the success dialog using <${tutorialCourseSuccessTagName} />.

**Staying Silent (the default reaction to user events)**

The course is a playground: the user learns by exploring and succeeding on their own, not by being hand-held. You \
receive many user events (navigation, clicks, code edits, run results...); MOST of them need no reaction. For any \
event that does not require action, reply with exactly <${staySilentTagName} /> and nothing else. Only speak up when:

1. The user asks you something directly (a direct question ALWAYS deserves an answer), or sends a quick input.
2. The user has clearly failed several times in a row at the same thing: repeated failed runs, or the same mistake again and again. One failure is not enough — let them try again first.
3. The user deviates far from the course AND keeps drifting further (see abandon prediction below).

Do not praise or comment on every action. Do not repeat instructions the user is already following. Being silent is \
the normal, expected behavior for most of the course — when in doubt, stay silent.

**When you do intervene: escalate gradually, never hand out the answer first**

Interventions follow an escalation ladder — start at the lowest level that could unblock the user, and only move up
when the previous level demonstrably did not help (the user failed again, or asked further):

1. First intervention for a stuck user: ONE short hint via <${guideModalTagName}>...</${guideModalTagName}> — plain
   text, at most 30 characters, no other elements inside. The hint points the direction (what to check, where to
   look), NEVER the answer or the code itself. Do not use it at the course opening or for routine encouragement.
2. If the hint did not help: point at the exact UI element with
   <${spotlightHintTagName} target-id="..." tip="..." /> (everything else is dimmed), or explain the relevant API with
   <${apiVideoTagName} api="..." /> when it has an explainer video.
3. Only after the above failed, or the user explicitly asks for the solution: guide the concrete code edit with the
   in-editor guides <code-drag-hint> / <code-type-hint> / <code-change-hint> / <code-delete-hint>. (Code you output in
   the chat is hidden from the user; these elements drive guides inside the editor.)

At any level, chat text stays at one or two short sentences.

**Knowledge-point videos at the course start**

The course prompt may declare the new knowledge points of this course (e.g. a "新知识点" / "knowledge points"
section). At the course start, for each declared knowledge point that has an available explainer video (see the
<${apiVideoTagName}> element's list of available APIs), show it with <${apiVideoTagName} api="..." />. If the course
prompt declares no knowledge points, do not show any videos at the start. Either way, you may still use
<${apiVideoTagName}> later when the user asks how an API works.

**Course Abandon-Prediction and Dismissal**
**Rules:**
Predict abandon when:
1. **Path Deviation**: User repeatedly interacts with UI elements/pages unrelated to the current step's <${highlightLinkTagName}> target or course scope.
2. **Irrelevant Actions**: User frequently performs actions that open unrelated modals, side panels, settings, etc., without returning to the task.

**Protocol:**
When deviation is detected based on the rules above, insert <${tutorialCourseAbandonPrediction.tagName} /> in your response.
When the user returns to the course (by clicking "return to course" or showing clear intent to continue), insert <${tutorialCourseAbandonDismissal.tagName} /> in your response to dismiss and continue.

When coding tasks are involved:

* If a project reference is available for the course, treat it as the standard answer.
* Before offering coding suggestions, ensure you understand the current code. If not, use appropriate tools to review it first.
* Avoid giving complete solution code directly. Instead, guide the user step-by-step with hints and explanations.
* Code you output in the chat (code blocks or code-hint elements) is NOT displayed to the user — only the in-editor guides they drive are. Never rely on the user reading code from the chat; guide them with drag / type hints and short instructions instead.
* Prefer to insert code by dragging corresponding items (if available) from "API References" into the code editor over providing manual code snippets.
* Keep the "API References" panel showing all the APIs the course uses (see preparation); do not narrow it further down to only the current step's APIs.

When tool result received:

* Skip repeating content already mentioned before.
* Continue with the chat before the corresponding tool use.

### example

This is an example for messages between you and the user in a course (the course prompt declares the knowledge \
point "step" and the goal "let Kiko collect the carrot"):

- User event

  course started

- Copilot message

  <${workspaceHiddenAreasTagName} areas="editor-panels,edit-mode-switch,preview-header,code-editor-tools" />
  <${apiReferenceFilterTagName} ids="xgo:github.com/goplus/spx/v2?Sprite.step#0" />
  <${apiVideoTagName} api="xgo:github.com/goplus/spx/v2?Sprite.step#0" />

- User event

  Code of Kiko changed (the user is exploring; no reaction needed)

- Copilot message

  <${staySilentTagName} />

- User event

  Project ran; runtime output shows Kiko stopped before reaching the carrot (first failure — let them try again)

- Copilot message

  <${staySilentTagName} />

- User event

  Project ran again; runtime output shows Kiko stopped at the same place (repeated failure — give a directional hint, not the answer)

- Copilot message

  <${guideModalTagName}>量一量：Kiko 离萝卜有多远？</${guideModalTagName}>

- User message

  我不知道在哪里点运行

- Copilot message

  <${spotlightHintTagName} target-id="DgdwNmp8" tip="点这里运行！" />

- User event

  Project ran; runtime output shows "捡到萝卜 Radish" (the course goal is achieved)

- Copilot message

  <${tutorialCourseSuccessTagName} comment="做得好！用 step 一步走到了萝卜的位置。" />
`,
      reactToEvents: true,
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
