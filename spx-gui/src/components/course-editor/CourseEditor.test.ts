import { VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { createI18n } from '@/utils/i18n'
import { fromConfig, fromText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import type { PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { courseEditorPreviewRouteName, courseEditorRouteName, courseEditorRoutes } from '@/apps/xbuilder/router'
import CourseEditor from './CourseEditor.vue'

// The preview is what these tests drive, so everything the editing pane is made of is stood in for: the course
// documents (one of them carries Monaco), the embedded Project Editor, and the Copilot the author writes with.
const { mocks } = vi.hoisted(() => ({
  mocks: {
    getCourse: vi.fn(),
    /** What the completion modal resolves with, i.e. which button the learner is taken to have pressed. */
    completionAction: 'exit' as 'continueEditing' | 'next' | 'exit',
    /** The props the completion modal was opened with, one entry per completed course. */
    completionProps: [] as Array<{ course: PlaygroundCourse }>,
    /** When set, the modal is answered only when the test settles this promise, not right away. */
    completionAnswer: null as Promise<'continueEditing' | 'next' | 'exit'> | null
  }
}))

vi.mock('@/apis/course', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/course')>()),
  getCourse: mocks.getCourse
}))

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useMessage: () => ({
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    withLoading: (promise: Promise<unknown>) => promise
  }),
  useConfirmDialogWithResult: () => async () => true,
  useModal: (component: { __name?: string }) => async (props: { course: PlaygroundCourse }) => {
    if (component.__name !== 'CoursePlaygroundCompletionModal') {
      throw new Error(`unexpected modal in this test: ${component.__name}`)
    }
    mocks.completionProps.push(props)
    return mocks.completionAnswer ?? mocks.completionAction
  }
}))

vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: (...args: unknown[]) => unknown) => ({
    fn: async (...args: unknown[]) => {
      await fn(...args)
    },
    isLoading: { value: false }
  })
}))

vi.mock('@/components/copilot/context', () => ({
  useCopilot: () => ({
    active: false,
    exportCurrentSession: () => null,
    restoreSession: vi.fn(),
    endCurrentSession: vi.fn(),
    open: vi.fn(),
    close: vi.fn()
  })
}))
vi.mock('./copilot', () => ({ useCourseEditorCopilot: () => {} }))
vi.mock('./project', () => ({ getProjectEditorHost: () => ({ name: 'ProjectEditorHost', render: () => null }) }))
vi.mock('@/components/tutorials/playground/CoursePlayground.vue', () => ({
  default: {
    name: 'CoursePlayground',
    props: ['project'],
    emits: ['courseCompleted', 'failed'],
    render: () => null
  }
}))
vi.mock('./CourseTextDoc.vue', () => ({ default: { name: 'CourseTextDoc', render: () => null } }))
vi.mock('./CourseConfigDoc.vue', () => ({ default: { name: 'CourseConfigDoc', render: () => null } }))
vi.mock('./CourseResourceDoc.vue', () => ({ default: { name: 'CourseResourceDoc', render: () => null } }))
vi.mock('./CourseFileDoc.vue', () => ({ default: { name: 'CourseFileDoc', render: () => null } }))

const seriesID = '40'

function makeCourse(id: string, title: string): PlaygroundCourse {
  return {
    id,
    owner: 'curator',
    kind: 'playground',
    title,
    thumbnail: 'kodo://bucket/thumbnail',
    content: {},
    createdAt: '2026-09-22T00:00:00Z',
    updatedAt: '2026-09-22T00:00:00Z'
  } as unknown as PlaygroundCourse
}

function makeSeries(courseIDs: string[]): CourseSeries {
  return {
    id: seriesID,
    owner: 'curator',
    kind: 'playground',
    title: 'A series',
    thumbnail: 'kodo://bucket/thumbnail',
    description: '',
    courseIDs,
    order: 1,
    createdAt: '2026-09-22T00:00:00Z',
    updatedAt: '2026-09-22T00:00:00Z'
  } as unknown as CourseSeries
}

function makeFiles(): Files {
  return {
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '',
      copilotContext: ''
    }),
    [mainCourseFilePath]: fromText(mainCourseFilePath, 'onStart => {}'),
    'project/assets/index.json': fromConfig('index.json', {})
  }
}

async function loadProject(course: PlaygroundCourse) {
  const project = new TutorialProject()
  await project.load({ metadata: course, files: makeFiles() })
  return project
}

type TestRouter = ReturnType<typeof createRouter>

/** Go to the preview of `course`, the way the Preview button or browser history does. */
async function enterPreview(router: TestRouter, course: PlaygroundCourse) {
  await router.push({
    name: courseEditorPreviewRouteName,
    params: { courseSeriesIdInput: seriesID, courseIdInput: course.id, inEditorPath: [] }
  })
  await flushPromises()
}

/** Go back to editing `course`, the way "Back to editor" or the browser's Back button does. */
async function leavePreview(router: TestRouter, course: PlaygroundCourse) {
  await router.push({
    name: courseEditorRouteName,
    params: { courseSeriesIdInput: seriesID, courseIdInput: course.id, inCourseEditorPath: [] }
  })
  await flushPromises()
}

/** A promise the test settles when it chooses, to make a request finish late. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Mount the editor for `course` of `series`, already showing the preview of the course being edited. */
async function mountPreviewing(course: PlaygroundCourse, series: CourseSeries, options?: { editing?: boolean }) {
  const router = createRouter({ history: createMemoryHistory(), routes: courseEditorRoutes })
  if (options?.editing) {
    await router.push({
      name: courseEditorRouteName,
      params: { courseSeriesIdInput: series.id, courseIdInput: course.id, inCourseEditorPath: [] }
    })
  } else {
    await router.push({
      name: courseEditorPreviewRouteName,
      params: { courseSeriesIdInput: series.id, courseIdInput: course.id, inEditorPath: [] }
    })
  }
  await router.isReady()
  const project = await loadProject(course)
  const wrapper = mount(CourseEditor, {
    props: { course, series, project },
    global: {
      plugins: [createI18n({ lang: 'en' }), router, VueQueryPlugin],
      directives: { radar: {} },
      stubs: {
        CourseExplorer: true,
        NavbarWrapper: true,
        EditorHistoryButtons: true,
        EditorModeSwitch: true,
        UIError: true,
        UIDetailedLoading: true,
        UILoading: true
      }
    }
  })
  await flushPromises()
  return { wrapper, router, project }
}

/** Report that the previewed course ran to its end, the way the playground's runner does. */
async function completePreviewedCourse(wrapper: Awaited<ReturnType<typeof mountPreviewing>>['wrapper']) {
  wrapper.findComponent({ name: 'CoursePlayground' }).vm.$emit('courseCompleted', { feedback: null })
  await flushPromises()
}

describe('CourseEditor preview', () => {
  beforeEach(() => {
    mocks.getCourse.mockReset()
    mocks.completionProps.length = 0
    mocks.completionAction = 'exit'
    mocks.completionAnswer = null
  })

  it('runs the course being edited, from the author unsaved work', async () => {
    const course = makeCourse('2338', 'First')
    const { wrapper, project } = await mountPreviewing(course, makeSeries(['2338', '2339']))

    const playground = wrapper.findComponent({ name: 'CoursePlayground' })
    expect(playground.exists()).toBe(true)
    // A snapshot of the author's work, not the project itself: the course must not edit what is being authored.
    expect(playground.props('project')).not.toBe(project)
    expect(mocks.getCourse).not.toHaveBeenCalled()
  })

  it('walks on to the next course of the series, as it was saved', async () => {
    const next = makeCourse('2339', 'Second')
    mocks.getCourse.mockResolvedValue(next)
    const loadSaved = vi.spyOn(TutorialProject, 'load').mockImplementation((course) => loadProject(course))
    mocks.completionAction = 'next'
    const { wrapper, router } = await mountPreviewing(makeCourse('2338', 'First'), makeSeries(['2338', '2339']))
    const first = wrapper.findComponent({ name: 'CoursePlayground' }).props('project')

    await completePreviewedCourse(wrapper)

    expect(mocks.getCourse).toHaveBeenCalledWith('2339')
    expect(loadSaved).toHaveBeenCalledWith(next)
    const playground = wrapper.findComponent({ name: 'CoursePlayground' })
    expect(playground.props('project')).not.toBe(first)
    expect((playground.props('project') as TutorialProject).title).toBe('Second')
    // Still the preview of the same editing session: the author has not left the course they are writing.
    expect(router.currentRoute.value.name).toBe(courseEditorPreviewRouteName)
    expect(router.currentRoute.value.params.courseIdInput).toBe('2338')
    loadSaved.mockRestore()
  })

  it('tells the completion modal which course was completed', async () => {
    mocks.getCourse.mockResolvedValue(makeCourse('2339', 'Second'))
    const loadSaved = vi.spyOn(TutorialProject, 'load').mockImplementation((course) => loadProject(course))
    mocks.completionAction = 'next'
    const { wrapper } = await mountPreviewing(makeCourse('2338', 'First'), makeSeries(['2338', '2339']))

    await completePreviewedCourse(wrapper)
    mocks.completionAction = 'exit'
    await completePreviewedCourse(wrapper)

    expect(mocks.completionProps.map((props) => props.course.id)).toEqual(['2338', '2339'])
    loadSaved.mockRestore()
  })

  it('leaves the preview at the end of the series', async () => {
    mocks.completionAction = 'next'
    // The course being edited is the last one, so the modal offers no next course -- and a late click cannot
    // walk past the end either.
    const { wrapper, router } = await mountPreviewing(makeCourse('2339', 'Second'), makeSeries(['2338', '2339']))

    await completePreviewedCourse(wrapper)

    expect(mocks.getCourse).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe(courseEditorRouteName)
  })

  it('stays where it is when the author chooses to keep looking around', async () => {
    mocks.completionAction = 'continueEditing'
    const { wrapper, router } = await mountPreviewing(makeCourse('2338', 'First'), makeSeries(['2338', '2339']))
    const running = wrapper.findComponent({ name: 'CoursePlayground' }).props('project')

    await completePreviewedCourse(wrapper)

    expect(wrapper.findComponent({ name: 'CoursePlayground' }).props('project')).toBe(running)
    expect(router.currentRoute.value.name).toBe(courseEditorPreviewRouteName)
  })

  it('reports a course of the series it cannot load, instead of leaving the preview', async () => {
    mocks.getCourse.mockRejectedValue(new Error('Not found'))
    mocks.completionAction = 'next'
    const { wrapper, router } = await mountPreviewing(makeCourse('2338', 'First'), makeSeries(['2338', '2339']))

    await completePreviewedCourse(wrapper)

    expect(wrapper.findComponent({ name: 'CoursePlayground' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'UIError' }).exists()).toBe(true)
    expect(router.currentRoute.value.name).toBe(courseEditorPreviewRouteName)
  })
})

// A preview is left and entered again freely (Back to editor, browser history), and what it started can still be
// in flight when it is. What belongs to a preview the author has left must not reach the one they are in.
describe('CourseEditor preview, entered again', () => {
  beforeEach(() => {
    mocks.getCourse.mockReset()
    mocks.completionProps.length = 0
    mocks.completionAction = 'exit'
    mocks.completionAnswer = null
  })

  it('keeps the running preview when a course it walked away from fails to load later', async () => {
    const first = makeCourse('2338', 'First')
    const abandoned = deferred<PlaygroundCourse>()
    mocks.getCourse.mockReturnValue(abandoned.promise)
    mocks.completionAction = 'next'
    const { wrapper, router } = await mountPreviewing(first, makeSeries(['2338', '2339']))

    // Walking on to the next course starts loading it; the author goes back to the editor meanwhile, and in again.
    await completePreviewedCourse(wrapper)
    await leavePreview(router, first)
    await enterPreview(router, first)
    expect(wrapper.findComponent({ name: 'CoursePlayground' }).exists()).toBe(true)

    abandoned.reject(new Error('Network error'))
    await flushPromises()

    expect(wrapper.findComponent({ name: 'UIError' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'CoursePlayground' }).exists()).toBe(true)
  })

  it('keeps the running preview when a snapshot it walked away from fails later', async () => {
    const first = makeCourse('2338', 'First')
    const { wrapper, router, project } = await mountPreviewing(first, makeSeries(['2338']), { editing: true })
    const abandoned = deferred<Awaited<ReturnType<TutorialProject['snapshot']>>>()
    // The first preview's snapshot hangs; the one after it is taken as usual.
    vi.spyOn(project, 'snapshot').mockReturnValueOnce(abandoned.promise)

    await enterPreview(router, first)
    await leavePreview(router, first)
    await enterPreview(router, first)
    expect(wrapper.findComponent({ name: 'CoursePlayground' }).exists()).toBe(true)

    abandoned.reject(new Error('Export failed'))
    await flushPromises()

    expect(wrapper.findComponent({ name: 'UIError' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'CoursePlayground' }).exists()).toBe(true)
  })

  it('does not let a completion modal answered after the author came back walk the new preview on', async () => {
    const first = makeCourse('2338', 'First')
    const answer = deferred<'continueEditing' | 'next' | 'exit'>()
    mocks.completionAnswer = answer.promise
    const { wrapper, router } = await mountPreviewing(first, makeSeries(['2338', '2339']))

    // The modal is still open when the author steps Back out of the preview, and Forward into it again.
    await completePreviewedCourse(wrapper)
    await leavePreview(router, first)
    await enterPreview(router, first)
    const running = wrapper.findComponent({ name: 'CoursePlayground' }).props('project')

    answer.resolve('next')
    await flushPromises()

    expect(mocks.getCourse).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'CoursePlayground' }).props('project')).toBe(running)
  })

  it('does not let a completion modal answered after the author came back end the new preview', async () => {
    const first = makeCourse('2338', 'First')
    const answer = deferred<'continueEditing' | 'next' | 'exit'>()
    mocks.completionAnswer = answer.promise
    const { wrapper, router } = await mountPreviewing(first, makeSeries(['2338', '2339']))

    await completePreviewedCourse(wrapper)
    await leavePreview(router, first)
    await enterPreview(router, first)

    answer.resolve('exit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe(courseEditorPreviewRouteName)
  })
})
