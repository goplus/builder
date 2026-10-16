import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages } from '@/apps/xbuilder/pages/test'
import * as courseApis from '@/apis/course'
import * as courseSeriesApis from '@/apis/course-series'

describe('course series order', () => {
  setupPageTests()

  it.each([8, 10])('keeps all 72 lessons in series order across pages of %i', async (pageSize) => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query === '(min-width: 1680px)' && pageSize === 10,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }) as unknown as MediaQueryList
    )
    const courses: courseApis.Course[] = Array.from({ length: 72 }, (_, index) => ({
      id: String(100 - index),
      owner: 'curator',
      kind: 'playground',
      title: `${index + 1}. Lesson`,
      thumbnail: '',
      content: {}
    }))
    vi.mocked(courseSeriesApis.getCourseSeries).mockResolvedValue({
      id: 'lita',
      owner: 'curator',
      kind: 'playground',
      title: 'Code: Lita',
      description: '',
      thumbnail: '',
      courseIDs: courses.map((course) => course.id),
      order: 0,
      createdAt: '',
      updatedAt: ''
    })
    // The list endpoint does not currently honor sequenceInCourseSeries.
    const unordered = [...courses.slice(35), ...courses.slice(0, 35)]
    vi.mocked(courseApis.listCourses).mockImplementation(async (params) => {
      const start = ((params?.pageIndex ?? 1) - 1) * (params?.pageSize ?? 8)
      return { total: 72, data: unordered.slice(start, start + (params?.pageSize ?? 8)) }
    })
    vi.mocked(courseApis.getCourse).mockImplementation(async (id) => courses.find((course) => course.id === id)!)
    const { wrapper } = await mountPages('/course-series/lita')

    for (let page = 1; page <= Math.ceil(courses.length / pageSize); page++) {
      if (page > 1) {
        await wrapper
          .findAll('button')
          .find((button) => button.text() === String(page))!
          .trigger('click')
      }
      const expected = courses.slice((page - 1) * pageSize, page * pageSize)
      await vi.waitFor(() => {
        const links = wrapper.findAll('a[href^="/course/lita/"]')
        expect(links.map((link) => link.text())).toEqual(expected.map((course) => course.title))
        expect(links.map((link) => link.attributes('href'))).toEqual(
          expected.map((course) => `/course/lita/${course.id}/start`)
        )
      })
    }
    expect(courseApis.getCourse).toHaveBeenCalledTimes(72)
  })
})
