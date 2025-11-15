import { inject, provide, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import type { Router } from 'vue-router'

import { timeout, until } from '@/utils/utils'
import { userSessionStorageRef } from '@/utils/user-storage'
import type { Copilot, Topic } from '@/components/copilot/copilot'
import { tagName as highlightLinkTagName } from '@/components/copilot/custom-elements/HighlightLink.vue'
import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'

import { name as tutorialStateIndicatorName } from './TutorialStateIndicator.vue'
import { tagName as tutorialCourseSuccessTagName } from './TutorialCourseSuccess.vue'
import { tutorialCourseAbandonDismissal, tutorialCourseAbandonPrediction } from './tutorial-course-abandon'

const tutorialKey: InjectionKey<Tutorial> = Symbol('tutorial')

export function orderBy(courses: Course[], courseIDs?: string[]) {
  if (!courseIDs) return courses
  return [...courses].sort((a, b) => courseIDs.indexOf(a.id) - courseIDs.indexOf(b.id))
}

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

* Clearly define the course completion criteria.

Then guide the user through each step. For each step:

1. If extra information required, use appropriate tool to gather it.
2. Give short and clear instructions on what the user needs to do.
3. Wait for the user to complete the step. You will get notified about further user events or inputs.
4. If the user has any questions, answer them based on the course information provided. If the question is outside the scope of the course, redirect the user to the core course content.
5. If the user finished current step, move on to the next step.

If all steps are completed according to the criteria, invoke a success dialog using <${tutorialCourseSuccessTagName} />.

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
* Prefer to insert code by dragging corresponding items (if available) from "API References" into the code editor over providing manual code snippets.

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
      stateIndicator: tutorialStateIndicatorName
    }
  }

  endCurrentCourse() {
    this.copilot.close()
    this.copilot.endCurrentSession()
    this.course.value = null
    this.series.value = null
    this.abandonPredictionCountRef.value = 0
  }
}
