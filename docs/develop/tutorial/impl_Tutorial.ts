import { copilot, loadProject, router } from './base'
import { Course, CourseSeriesWithCourses } from './module_CourseApis'
import { useTutorial, Tutorial as ITutorial } from './module_Tutorial'

function TutorialRoot() {
  copilot.registerToolsProvider({
    provideTools() {
      return [
        {
          type: 'custom-element',
          tagName: 'tutorial-course-success',
          description: 'Displays a success message when a course is completed.',
          attributes: {
            'series-id': { type: 'string', description: 'ID for the course series' },
            'course-id': { type: 'string', description: 'ID for the course' },
          },
          component: TutorialCourseSuccess,
        },
        {
          type: 'function',
          name: 'readReferenceProjectSpriteCode',
          description: 'Reads the code of a sprite from the reference project.',
          parameters: {
            projectFullName: { type: 'string', description: 'Full name of the project' },
            spriteName: { type: 'string', description: 'Name of the sprite' },
          },
          implementation: readReferenceProjectSpriteCode,
        }
      ]
    }
  })
}

class Tutorial implements ITutorial {
  declare currentCourse: Course | null
  declare currentSeries: CourseSeriesWithCourses | null

  async startCourse(course: Course, series: CourseSeriesWithCourses) {
    this.currentCourse = course
    this.currentSeries = series

    await copilot.startSession({
      description: `
Now you will help the user to learn a course: ${course.title}.
Here's what you need to know about the course:
<course>
  <series-id>${series.id}</series-id>
  <course-id>${course.id}</course-id>
  <course-title>${course.title}</course-title>
  <course-prompt>${course.prompt}</course-prompt>
  <course-references>
    ${course.references.map(ref => `<project-reference>${ref.fullName}</project-reference>`).join('\n')}
  </course-references>
</course>
`,
      reactToEvents: true
    })

    await router.push(course.entrypoint)

    copilot.notifyUserEvent({
      en: 'Course Started',
      zh: '课程开始'
    }, 'Now the course has just started.')
  }

  endCurrentCourse() {
    copilot.endCurrentSession()
    this.currentCourse = null
    this.currentSeries = null
  }
}

function TutorialCourseSuccess() {

  const tutorial = useTutorial()
  const course = tutorial.currentCourse!
  const series = tutorial.currentSeries!

  tutorial.endCurrentCourse()

  function handleGoToTutorial() {
    router.push('/tutorial')
  }

  async function handleNextCourse() {
    const courseIdx = series.courses.findIndex(c => c.id === course.id)
    const nextCourse = series.courses[courseIdx + 1]
    await tutorial.startCourse(nextCourse, series)
  }
}

async function readReferenceProjectSpriteCode(params: {
  projectFullName: string
  spriteName: string
}) {
  const project = await loadProject(params.projectFullName)
  return project.sprites.find((s: any) => s.name === params.spriteName).code
}
