import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages } from '@/apps/xbuilder/pages/test'
import * as courseApis from '@/apis/course'
import * as courseSeriesApis from '@/apis/course-series'

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

  it('lists a series not divided a page at a time', async () => {
    const { wrapper } = await mountPages('/course-series/space')

    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    expect(courseApis.listAllSeriesCourses).toHaveBeenCalledWith('space', expect.any(AbortSignal))
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
