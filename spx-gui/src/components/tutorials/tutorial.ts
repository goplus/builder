import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import type { Router } from 'vue-router'

import { timeout, localStorageRef } from '@/utils/utils'
import type { Copilot, Topic } from '@/components/copilot/copilot'
import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'

import { name as tutorialStateIndicatorName } from './TutorialStateIndicator.vue'

export type CourseSeriesWithCourses = CourseSeries & {
  courses: Course[]
}

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

export class Tutorial {
  private course = localStorageRef<Course | null>('spx-gui-tutorial-course', null)
  private series = localStorageRef<CourseSeriesWithCourses | null>('spx-gui-tutorial-series', null)

  constructor(
    private copilot: Copilot,
    private router: Router
  ) {}

  get currentCourse(): Course | null {
    return this.course.value
  }

  get currentSeries(): CourseSeriesWithCourses | null {
    return this.series.value
  }

  async startCourse(course: Course, series: CourseSeriesWithCourses): Promise<void> {
    try {
      this.endCurrentCourse()
      this.course.value = course
      this.series.value = series

      const { entrypoint } = course

      if (entrypoint) {
        await this.router.push(entrypoint)
        await timeout(100) // Wait for the router to finish navigation
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

  protected generateTopic(course: Course): Topic {
    const { id, title, prompt, references, entrypoint } = course
    return {
      title: { en: title, zh: title },
      description: `\
You are now helping the user to learn the course: ${course.title}.

### Tips

* Answer any questions the user ask about this course with precision and clarity.
* All of your responses must be strictly based on the course information provided below.
* If the user's question is outside the scope of the provided information, state that clearly and guide the user back to the core content of the course.
* When answering, give priority to the teaching guidelines in \`<course-prompt>\`.

### Tips about coding tasks in the course

* If a project reference is provided, it is considered to provide a standard answer for you.
* Make sure you know what the current code is before you give coding suggestions. If not, use proper tools to read the current code first.
* Avoid providing result code directly to the user. Instead, guide the user to write the code himself step-by-step by providing hints and explanations.
* Ensure the user is in editor for the right project. If the user navigated to somewhere else, notify him to come back. Or tell him to quit the course if he wants to.

### Detailed information of course ${course.title}

<course>
  <course-id>${id}</course-id>
  <course-title>${title}</course-title>
  <course-entrypoint>${entrypoint}</course-entrypoint>
  <course-prompt>
    ${prompt}
    First, based on the provided context, clearly define the course completion standards.
    Once the course tasks are finished according to these defined standards, your response must include the following:
    - According to the general rules, append the designated tag for course success at the end of your reply.
  </course-prompt>
  <course-references>
    ${references.map((ref) => `<project-reference>${ref.fullName}</project-reference>`).join('\n')}
  </course-references>
</course>`,
      reactToEvents: true,
      endable: false,
      stateIndicator: tutorialStateIndicatorName
    }
  }

  endCurrentCourse() {
    this.copilot.endCurrentSession()
    this.course.value = null
    this.series.value = null
  }
}
