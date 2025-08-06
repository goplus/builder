import { inject, provide, ref } from 'vue'
import type { InjectionKey } from 'vue'
import type { Router } from 'vue-router'

import type { Copilot, Topic } from '@/components/copilot/copilot'
import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'

import TutorialStateIndicator from './TutorialStateIndicator.vue'

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
  private course = ref<Course | null>(null)
  private series = ref<CourseSeriesWithCourses | null>(null)

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
      }

      await this.copilot.startSession(this.generateTopic(course, series))

      this.copilot.notifyUserEvent(
        {
          en: 'Course Started',
          zh: '课程开始'
        },
        'Now the course has just started.'
      )

      this.copilot.open()
    } catch (error) {
      console.error('Failed to start course:', error)
      this.endCurrentCourse()
      throw error
    }
  }

  protected generateTopic(course: Course, series: CourseSeriesWithCourses): Topic {
    const { id, title, prompt, references, entrypoint } = course
    return {
      title: { en: title, zh: title },
      description: `
## You are an expert-level Q&A assistant for the course: ${course.title}.

### TASK
1. Answer any questions I ask about this course with precision and clarity.
2. All of your responses must be strictly based on the course information provided below.
3. If my question is outside the scope of the provided information, state that clearly and guide me back to the core content of the course.
4. When answering, give priority to the teaching guidelines in \`<course-prompt>\` and the reference materials in \`<course-references>\`.
<course>
  <series-id>${series.id}</series-id>
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
</course>
      `,
      reactToEvents: true,
      endable: false,
      stateIndicator: TutorialStateIndicator
    }
  }

  endCurrentCourse() {
    this.copilot.endCurrentSession()
    this.course.value = null
    this.series.value = null
  }
}
