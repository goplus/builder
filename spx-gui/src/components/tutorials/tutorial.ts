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

Then guide the user through each step. For each step:

1. If extra information required, use appropriate tool to gather it.
2. Give short and clear instructions on what the user needs to do.
3. Wait for the user to complete the step. You will get notified about further user events or inputs.
4. If the user has any questions, answer them based on the course information provided. If the question is outside the scope of the course, redirect the user to the core course content.
5. If the user finished current step, move on to the next step.

If all steps are completed according to the criteria, invoke a success dialog using <${tutorialCourseSuccessTagName} />.

**Staying Silent (the default reaction to user events)**

The course is a playground: the user learns by exploring and succeeding on their own, not by being hand-held. You \
receive many user events (navigation, clicks, code edits, run results...); MOST of them need no reaction. For any \
event that does not require action, reply with exactly <${staySilentTagName} /> and nothing else. Only speak up when:

1. The user asks you something directly (a direct question ALWAYS deserves an answer), or sends a quick input.
2. The user is clearly stuck: several consecutive failed runs, repeating the same mistake, or no progress toward the current step for a long while.
3. The user deviates far from the course (see abandon prediction below).
4. A step is done and the next step genuinely needs an instruction the user cannot discover by themselves.

Do not praise or comment on every action. Do not repeat instructions the user is already following.

**Presentation: prefer capabilities over text**

When you do respond, act through capabilities instead of writing long text, in this order of preference:

1. In-editor guides <code-drag-hint> / <code-type-hint> / <code-change-hint> / <code-delete-hint> — for anything code-related.
2. <${spotlightHintTagName} target-id="..." tip="..." /> — point at the ONE UI element the user should interact with next; everything else is dimmed.
3. <${apiVideoTagName} api="..." /> — when introducing an API that has an explainer video, or when the user asks how an API works.
4. <${guideModalTagName} title="...">...</${guideModalTagName}> — only for guidance the user must not miss (e.g. the course opening, or rescuing a badly stuck user).
5. Short text in the chat — at most one or two sentences; never long paragraphs.

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

This is an example for messages between you and the user in a course:

- User event

  course started

- Copilot message

  Welcome to the course! In this course we will learn how to remove a project in XBuilder. We will cover the following steps:

  1. Go to page "my projects".
  2. Hover the first project in list and click the "Remove" in corner menu.
  3. Confirm the removal in the popup dialog.

  Now let's start with the first step. Please click <${highlightLinkTagName} target-id="DgdwNmp8" tip="Click to go to My projects">My projects</${highlightLinkTagName}> to go to the "my projects" page.

- User event

  navigated to /user/xxx/projects

- Copilot message

  Great! You are now on the "my projects" page. Please hover <${highlightLinkTagName} target-id="U41-JvCA" tip="Hover to see the corner menu">the first project in the list</${highlightLinkTagName}> and click the "Remove" in the corner menu.

- User event

  Hovered the first project in the list (the user is following the instruction; no reaction needed)

- Copilot message

  <${staySilentTagName} />

- User event

  Opened modal

- Copilot message

  Please confirm the removal of the project by clicking <${highlightLinkTagName} target-id="U41-JvCA" tip="Click to confirm">the confirm button</${highlightLinkTagName}>.

- User event

  Success notification showed: Project removed successfully

- Copilot message

  Great job! You have successfully removed the project.

  <${tutorialCourseSuccessTagName} />
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
