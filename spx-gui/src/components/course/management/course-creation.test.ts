import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AddCourseParams, Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { appendCourseToSeries, CourseCreation } from './course-creation'

const { addCourse, deleteCourse, getCourseSeries, updateCourseSeries } = vi.hoisted(() => ({
  addCourse: vi.fn(),
  deleteCourse: vi.fn(),
  getCourseSeries: vi.fn(),
  updateCourseSeries: vi.fn()
}))

vi.mock('@/apis/course', () => ({ addCourse, deleteCourse }))
vi.mock('@/apis/course-series', () => ({ getCourseSeries }))

function makeSeries(id: string, courseIDs: string[]): CourseSeries {
  return {
    id,
    owner: 'curator',
    kind: 'guided',
    title: `Series ${id}`,
    thumbnail: 'kodo://bucket/thumbnail',
    description: '',
    courseIDs,
    order: 1,
    createdAt: '2026-09-21T00:00:00Z',
    updatedAt: '2026-09-21T00:00:00Z'
  }
}

const course = { id: '2345', kind: 'guided', title: 'New course' } as Course
const params: AddCourseParams = {
  kind: 'guided',
  title: 'New course',
  thumbnail: 'kodo://bucket/thumbnail',
  content: { entrypoint: '/', prompt: 'Prompt' }
}

beforeEach(() => {
  addCourse.mockReset().mockResolvedValue(course)
  deleteCourse.mockReset().mockResolvedValue(undefined)
  getCourseSeries.mockReset().mockResolvedValue(makeSeries('39', ['2337']))
  updateCourseSeries
    .mockReset()
    .mockImplementation(async (id: string, patch: Partial<CourseSeries>) => ({ ...makeSeries(id, []), ...patch }))
})

describe('CourseCreation', () => {
  it('creates the course and puts it at the end of its series', async () => {
    const creation = new CourseCreation('39', updateCourseSeries)

    const result = await creation.run(async () => params)

    expect(addCourse).toHaveBeenCalledWith(params)
    expect(updateCourseSeries).toHaveBeenCalledWith('39', { courseIDs: ['2337', '2345'] })
    expect(result.course).toBe(course)
    expect(result.courseSeries.courseIDs).toEqual(['2337', '2345'])
  })

  it('does not create a second course when only adding it to the series failed', async () => {
    const creation = new CourseCreation('39', updateCourseSeries)
    const getParams = vi.fn(async () => params)
    updateCourseSeries.mockRejectedValueOnce(new Error('network'))

    // The course exists by now, and the author is told so rather than that creating it failed.
    await expect(creation.run(getParams)).rejects.toMatchObject({
      userMessage: { zh: expect.stringContaining('已经创建') }
    })
    expect(creation.createdCourse).toBe(course)

    // Clicking "Create" again only repeats what is left.
    await creation.run(getParams)
    expect(getParams).toHaveBeenCalledTimes(1)
    expect(addCourse).toHaveBeenCalledTimes(1)
    expect(updateCourseSeries).toHaveBeenCalledTimes(2)
  })

  it('starts over when creating the course itself failed', async () => {
    const creation = new CourseCreation('39', updateCourseSeries)
    addCourse.mockRejectedValueOnce(new Error('quota'))

    await expect(creation.run(async () => params)).rejects.toThrow('quota')
    expect(creation.createdCourse).toBeNull()
    expect(updateCourseSeries).not.toHaveBeenCalled()

    await creation.run(async () => params)
    expect(addCourse).toHaveBeenCalledTimes(2)
  })

  it('deletes a course it could not add to the series when given up', async () => {
    const creation = new CourseCreation('39', updateCourseSeries)
    updateCourseSeries.mockRejectedValueOnce(new Error('network'))
    await expect(creation.run(async () => params)).rejects.toBeTruthy()

    await creation.abandon()

    expect(deleteCourse).toHaveBeenCalledWith('2345')
    expect(creation.createdCourse).toBeNull()
  })

  it('keeps a course that is in its series when given up', async () => {
    const creation = new CourseCreation('39', updateCourseSeries)
    await creation.run(async () => params)

    await creation.abandon()

    expect(deleteCourse).not.toHaveBeenCalled()
  })
})

describe('appendCourseToSeries', () => {
  it('adds a course to the series as it is now, and touches nothing but its course list', async () => {
    // Someone added 2340 after the page was loaded; the list the page saw would have dropped it.
    getCourseSeries.mockResolvedValue(makeSeries('39', ['2337', '2340']))

    const updated = await appendCourseToSeries('39', '2345', updateCourseSeries)

    expect(updateCourseSeries).toHaveBeenCalledWith('39', { courseIDs: ['2337', '2340', '2345'] })
    expect(updated.courseIDs).toEqual(['2337', '2340', '2345'])
  })

  it('writes nothing when the course is already in the series', async () => {
    // A retry after a response that never arrived: the first attempt did go through.
    getCourseSeries.mockResolvedValue(makeSeries('39', ['2337', '2345']))

    const current = await appendCourseToSeries('39', '2345', updateCourseSeries)

    expect(updateCourseSeries).not.toHaveBeenCalled()
    expect(current.courseIDs).toEqual(['2337', '2345'])
  })
})
