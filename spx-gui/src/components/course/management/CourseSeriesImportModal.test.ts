import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { DefaultException } from '@/utils/exception'
import type { CourseSeries } from '@/apis/course-series'
import CourseSeriesImportModal from './CourseSeriesImportModal.vue'
import CourseSeriesFileSteps from './CourseSeriesFileSteps.vue'
import type { CourseSeriesFileProgress, CourseSeriesFileTaskOptions } from './course-series-file'

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  inspect: vi.fn(),
  import: vi.fn()
}))

vi.mock('./course-series-file', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./course-series-file')>()),
  readCourseSeriesFile: mocks.read,
  inspectCourseSeriesFileContent: mocks.inspect,
  importCourseSeriesFileContent: mocks.import
}))

vi.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (message: { en: string }) => message.en })
}))
vi.mock('@/stores/user', () => ({ useSignedInUser: () => ({ value: { username: 'curator' } }) }))
vi.mock('@/stores/course', () => ({ useDeleteCourse: () => vi.fn() }))
vi.mock('@/stores/course-series', () => ({ useUpdateCourseSeries: () => vi.fn() }))

vi.mock('@/components/ui', () => ({
  UIModal: defineComponent(
    (_, { slots }) =>
      () =>
        h('div', slots.default?.())
  ),
  UIButton: defineComponent({
    props: { disabled: Boolean, type: { type: String, default: '' }, loading: Boolean },
    emits: ['click'],
    setup(props, { slots, emit }) {
      return () => h('button', { disabled: props.disabled, onClick: () => emit('click') }, slots.default?.())
    }
  }),
  UIIcon: defineComponent({
    props: { type: { type: String, default: '' } },
    setup: (props) => () => h('i', { 'data-icon': props.type })
  })
}))

const series = { id: 'series', title: 'Code: Lita', kind: 'playground', courseIDs: ['old'], order: 1 } as CourseSeries

/** What each step shows: done, failed, stopped, running or pending. */
function stepStates(wrapper: ReturnType<typeof mount>) {
  const byIcon: Record<string, string> = { check: 'done', error: 'failed', minus: 'stopped', loading: 'running' }
  return wrapper.findAll('ol > li').map((li) => {
    const icon = li.find('i').exists() ? li.find('i').attributes('data-icon')! : ''
    return `${li.find('span:last-child').text()}: ${byIcon[icon] ?? 'pending'}`
  })
}

async function mountConfirming() {
  mocks.read.mockResolvedValue({
    manifest: { courseSeries: { title: 'Code: Lita', kind: 'playground' }, courses: [{}] }
  })
  mocks.inspect.mockResolvedValue({ kind: 'playground', deletedCourses: ['Old course'], overwrittenProjects: [] })
  const wrapper = mount(CourseSeriesImportModal, {
    props: { visible: true, file: new File([], 'series.xbcs.zip'), courseSeries: series, newSeriesOrder: 1 },
    global: { directives: { radar: {} }, mocks: { $t: (message: { en: string }) => message.en } }
  })
  await flushPromises()
  return wrapper
}

function report(options: CourseSeriesFileTaskOptions, ...steps: CourseSeriesFileProgress['step'][]) {
  for (const step of steps) options.onProgress?.({ step, done: 0, total: 1, files: null })
}

describe('CourseSeriesImportModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the update of the series as failed when it is undone', async () => {
    mocks.import.mockImplementation((_content, _target, _user, options: CourseSeriesFileTaskOptions) => {
      report(options, 'upload', 'commit', 'undo')
      return Promise.reject(new DefaultException({ en: 'The series could not be updated', zh: '系列更新失败' }))
    })
    const wrapper = await mountConfirming()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Import')!
      .trigger('click')
    await flushPromises()

    expect(stepStates(wrapper)).toEqual([
      'Read the file: done',
      'Check the courses: done',
      'Upload and create the courses: done',
      'Update the course series: failed',
      'Undo what was written: done'
    ])
  })

  it('does not say the import is almost done while a failed upload is undone', async () => {
    let fail!: () => void
    mocks.import.mockImplementation((_content, _target, _user, options: CourseSeriesFileTaskOptions) => {
      report(options, 'upload', 'undo')
      return new Promise(
        (_, reject) => (fail = () => reject(new DefaultException({ en: 'Upload failed', zh: '上传失败' })))
      )
    })
    const wrapper = await mountConfirming()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Import')!
      .trigger('click')
    await flushPromises()

    expect(stepStates(wrapper)).toEqual([
      'Read the file: done',
      'Check the courses: done',
      'Upload and create the courses: failed',
      'Undo what was written: running'
    ])
    expect(wrapper.text()).not.toContain('can no longer be cancelled')

    fail()
    await flushPromises()
    expect(stepStates(wrapper).at(-1)).toBe('Undo what was written: done')
  })
})

describe('CourseSeriesFileSteps', () => {
  it.each<{ progress: CourseSeriesFileProgress; count: string }>([
    { progress: { step: 'upload', done: 1, total: 2, files: { done: 5, total: 10 } }, count: '5 / 10 files' },
    { progress: { step: 'download', done: 2, total: 4, files: null }, count: '2 / 4 files' }
  ])('shows file counts for $progress.step', ({ progress, count }) => {
    const wrapper = mount(CourseSeriesFileSteps, {
      props: { steps: [{ step: progress.step, label: { en: 'Transfer', zh: '传输' }, status: 'running' }], progress },
      global: { mocks: { $t: (message: { en: string }) => message.en } }
    })

    expect(wrapper.text()).toContain(count)
    expect(wrapper.find('[style="width: 50%;"]').exists()).toBe(true)
  })
})
