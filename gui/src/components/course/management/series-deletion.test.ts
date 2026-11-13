import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CourseSeries } from '@/apis/course-series'
import { deleteCourseSeriesWithCourses } from './series-deletion'

const { getCourseSeries } = vi.hoisted(() => ({ getCourseSeries: vi.fn() }))

vi.mock('@/apis/course-series', () => ({ getCourseSeries }))

const deleteCourse = vi.fn()
const deleteCourseSeries = vi.fn()
const writes = { deleteCourse, deleteCourseSeries }

beforeEach(() => {
  getCourseSeries.mockReset().mockResolvedValue({ id: '39', courseIDs: ['1', '2', '3'] } as CourseSeries)
  deleteCourse.mockReset().mockResolvedValue(undefined)
  deleteCourseSeries.mockReset().mockResolvedValue(undefined)
})

describe('deleteCourseSeriesWithCourses', () => {
  it('deletes the courses the series holds now, then the series', async () => {
    await deleteCourseSeriesWithCourses('39', writes)

    expect(deleteCourse.mock.calls).toEqual([['1'], ['2'], ['3']])
    expect(deleteCourseSeries).toHaveBeenCalledWith('39')
    expect(deleteCourseSeries.mock.invocationCallOrder[0]).toBeGreaterThan(
      Math.max(...deleteCourse.mock.invocationCallOrder)
    )
  })

  it('keeps the series when a course could not be deleted, so that no course is left in no series', async () => {
    deleteCourse.mockImplementation(async (id: string) => {
      if (id === '2') throw new Error('network')
    })

    await expect(deleteCourseSeriesWithCourses('39', writes)).rejects.toMatchObject({
      userMessage: { en: expect.stringContaining('2 of 3 courses were deleted') }
    })
    expect(deleteCourseSeries).not.toHaveBeenCalled()
  })

  it('deletes an empty series', async () => {
    getCourseSeries.mockResolvedValue({ id: '39', courseIDs: [] as string[] } as CourseSeries)

    await deleteCourseSeriesWithCourses('39', writes)

    expect(deleteCourse).not.toHaveBeenCalled()
    expect(deleteCourseSeries).toHaveBeenCalledWith('39')
  })
})
