import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages } from '@/apps/xbuilder/pages/test'
import * as courseApis from '@/apis/course'
import * as courseSeriesApis from '@/apis/course-series'

const responsive = vi.hoisted(() => ({ large: null as ReturnType<typeof ref<boolean>> | null }))
vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useResponsive: () => responsive.large
}))
beforeEach(() => {
  responsive.large = ref(false)
})

function makeCourse(id: string, title: string): courseApis.Course {
  return {
    id,
    owner: 'alice',
    kind: 'guided',
    title,
    thumbnail: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    content: { entrypoint: `/editor/alice/${id}`, prompt: 'Build a spaceship' }
  }
}

describe('course series', () => {
  setupPageTests()

  it('lists a series divided into units by unit, from the whole list of its courses', async () => {
    const series = await courseSeriesApis.getCourseSeries('space')
    vi.mocked(courseSeriesApis.getCourseSeries).mockResolvedValue({
      ...series,
      units: [
        { id: 'basics', title: 'Basics', courseIDs: ['first-flight'] },
        { id: 'arrival', title: 'Arrival', courseIDs: ['landing'] }
      ]
    })
    vi.mocked(courseApis.listAllSeriesCourses).mockResolvedValue([
      makeCourse('first-flight', 'First flight'),
      makeCourse('landing', 'Landing')
    ])
    const { wrapper, router } = await mountPages('/course-series/space?unit=2')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Arrival'))
    expect(wrapper.get('a[href="/course/space/landing/start"]').text()).toContain('Landing')
    expect(wrapper.find('a[href="/course/space/first-flight/start"]').exists()).toBe(false)
    expect(router.currentRoute.value.fullPath).toBe('/course-series/space?unit=2')
    expect(courseApis.listAllSeriesCourses).toHaveBeenCalledWith('space', expect.any(AbortSignal))
    expect(courseApis.listCourses).not.toHaveBeenCalled()
  })

  it('locates a course after series data loads, then lets the learner change units', async () => {
    const original = await courseSeriesApis.getCourseSeries('space')
    let finish!: (series: typeof original) => void
    vi.mocked(courseSeriesApis.getCourseSeries).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    vi.mocked(courseApis.listAllSeriesCourses).mockResolvedValue([
      makeCourse('first-flight', 'First flight'),
      makeCourse('landing', 'Landing')
    ])
    const { wrapper, router } = await mountPages('/course-series/space#course-landing')
    expect(router.currentRoute.value.hash).toBe('#course-landing')
    finish({
      ...original,
      courseIDs: ['first-flight', 'landing'],
      units: [
        { id: 'basics', title: 'Basics', courseIDs: ['first-flight'] },
        { id: 'arrival', title: 'Arrival', courseIDs: ['landing'] }
      ]
    })
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/course-series/space?unit=2'))
    expect(wrapper.text()).toContain('Landing')
    await router.push('/course-series/space?unit=1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    expect(router.currentRoute.value.query.unit).toBe('1')
  })

  it('locates an ungrouped course on its page and consumes the hash', async () => {
    const courses = Array.from({ length: 21 }, (_, i) => makeCourse(String(i), 'Lesson ' + i))
    const series = await courseSeriesApis.getCourseSeries('space')
    vi.mocked(courseSeriesApis.getCourseSeries).mockResolvedValue({
      ...series,
      courseIDs: courses.map((c) => c.id),
      units: []
    })
    vi.mocked(courseApis.listAllSeriesCourses).mockResolvedValue(courses)
    const { wrapper, router } = await mountPages('/course-series/space#course-20')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/course-series/space?p=3'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Lesson 20'))
    await router.push('/course-series/space?p=1')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Lesson 0'))
    expect(router.currentRoute.value.query.p).toBe('1')
  })

  it('shows the default list when the linked course is no longer in the series', async () => {
    const { wrapper, router } = await mountPages('/course-series/space#course-deleted')
    await vi.waitFor(() => expect(router.currentRoute.value.hash).toBe(''))
    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    expect(router.currentRoute.value.fullPath).toBe('/course-series/space')
  })

  it('clears the previous series title and links while a reused page loads a different series', async () => {
    const original = await courseSeriesApis.getCourseSeries('space')
    vi.mocked(courseSeriesApis.getCourseSeries).mockResolvedValue({ ...original, title: 'Series A' })
    vi.mocked(courseApis.listAllSeriesCourses).mockResolvedValue([makeCourse('a', 'Lesson A')])
    const { wrapper, router } = await mountPages('/course-series/space')
    await vi.waitFor(() => expect(wrapper.find('a[href="/course/space/a/start"]').exists()).toBe(true))
    let fail!: (error: Error) => void
    vi.mocked(courseSeriesApis.getCourseSeries).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject
        })
    )
    vi.mocked(courseApis.listAllSeriesCourses).mockResolvedValue([makeCourse('b', 'Lesson B')])
    await router.push('/course-series/B')
    await vi.waitFor(() => expect(fail).toBeTypeOf('function'))
    expect(document.title).toBe('Course Series - XBuilder')
    expect(wrapper.text()).not.toContain('Series A')
    expect(wrapper.find('a[href="/course/space/a/start"]').exists()).toBe(false)
    fail(new Error('B unavailable'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Failed to load course series'))
    expect(wrapper.text()).not.toContain('Series A')
    expect(wrapper.find('a[href="/course/space/a/start"]').exists()).toBe(false)
    vi.mocked(courseSeriesApis.getCourseSeries).mockResolvedValue({ ...original, id: 'B', title: 'Series B' })
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry')!
      .trigger('click')
    await vi.waitFor(() => expect(wrapper.find('a[href="/course/B/b/start"]').exists()).toBe(true))
    expect(document.title).toBe('Series B - Course Series - XBuilder')
  })

  it('lists a series not divided a page at a time', async () => {
    const { wrapper } = await mountPages('/course-series/space')

    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    expect(courseApis.listAllSeriesCourses).toHaveBeenCalledWith('space', expect.any(AbortSignal))
  })

  it('keeps courses visible when a wider layout makes the requested page out of range', async () => {
    vi.mocked(courseApis.listAllSeriesCourses).mockResolvedValue(
      Array.from({ length: 9 }, (_, i) => makeCourse(String(i), 'Lesson ' + i))
    )
    const { wrapper } = await mountPages('/course-series/space?p=2')
    await vi.waitFor(() => expect(wrapper.find('a[href="/course/space/8/start"]').exists()).toBe(true))
    expect(wrapper.find('a[href="/course/space/0/start"]').exists()).toBe(false)
    responsive.large!.value = true
    await vi.waitFor(() => expect(wrapper.find('a[href="/course/space/0/start"]').exists()).toBe(true))
    expect(wrapper.find('a[href="/course/space/8/start"]').exists()).toBe(true)
    expect(courseApis.listAllSeriesCourses).toHaveBeenCalledOnce()
  })

  it('paginates the complete list locally and reuses it when switching pages', async () => {
    const courses = Array.from({ length: 21 }, (_, i) => makeCourse(String(i), 'Lesson ' + i))
    vi.mocked(courseApis.listAllSeriesCourses).mockResolvedValue(courses)
    const { wrapper, router } = await mountPages('/course-series/space')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Lesson 0'))
    expect(wrapper.find('a[href="/course/space/20/start"]').exists()).toBe(false)
    await router.push('/course-series/space?p=2')
    await vi.waitFor(() => expect(wrapper.find('a[href="/course/space/0/start"]').exists()).toBe(false))
    expect(courseApis.listAllSeriesCourses).toHaveBeenCalledOnce()
    await router.push('/course-series/space?p=3')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Lesson 20'))
    expect(courseApis.listAllSeriesCourses).toHaveBeenCalledOnce()
  })
})
