import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CourseSeries } from '@/apis/course-series'
import { appendCourseToSeries, findSeriesOfCourse, listPlaygroundSeries } from './series'

const { listSignedInUserCourseSeries, getCourseSeries, updateCourseSeries } = vi.hoisted(() => ({
  listSignedInUserCourseSeries: vi.fn(),
  getCourseSeries: vi.fn(),
  updateCourseSeries: vi.fn()
}))

vi.mock('@/apis/course-series', () => ({ listSignedInUserCourseSeries, getCourseSeries, updateCourseSeries }))

function makeSeries(id: string, courseIDs: string[]): CourseSeries {
  return {
    id,
    owner: 'curator',
    kind: 'playground',
    title: `Series ${id}`,
    thumbnail: 'kodo://bucket/thumbnail',
    description: '',
    courseIDs,
    order: 1,
    createdAt: '2026-09-21T00:00:00Z',
    updatedAt: '2026-09-21T00:00:00Z'
  }
}

describe('Playground Course series lookup', () => {
  beforeEach(() => {
    listSignedInUserCourseSeries.mockReset()
    getCourseSeries.mockReset()
    updateCourseSeries.mockReset()
  })

  it('asks the server for Playground series only', async () => {
    listSignedInUserCourseSeries.mockResolvedValue({ total: 0, data: [] })

    await listPlaygroundSeries()

    expect(listSignedInUserCourseSeries).toHaveBeenCalledWith(expect.objectContaining({ kind: 'playground' }))
  })

  it('finds the series a course is written for', async () => {
    listSignedInUserCourseSeries.mockResolvedValue({
      total: 2,
      data: [makeSeries('39', ['2337']), makeSeries('40', ['2338', '2339'])]
    })

    expect((await findSeriesOfCourse('2339'))?.id).toBe('40')
  })

  it('says so when a course is in no series, since the Course Editor could not open it', async () => {
    listSignedInUserCourseSeries.mockResolvedValue({ total: 1, data: [makeSeries('39', ['2337'])] })

    expect(await findSeriesOfCourse('9999')).toBeNull()
  })

  it('adds a course to the series as it is now, and touches nothing but its course list', async () => {
    // Someone added 2340 after the form was loaded; the list the form saw would have dropped it.
    getCourseSeries.mockResolvedValue(makeSeries('39', ['2337', '2340']))
    updateCourseSeries.mockImplementation(async (id: string, patch: Partial<CourseSeries>) => ({
      ...makeSeries(id, []),
      ...patch
    }))

    const updated = await appendCourseToSeries('39', '2345')

    expect(updateCourseSeries).toHaveBeenCalledWith('39', { courseIDs: ['2337', '2340', '2345'] })
    expect(updated.courseIDs).toEqual(['2337', '2340', '2345'])
  })

  it('writes nothing when the course is already in the series', async () => {
    // A retry after a response that never arrived: the first attempt did go through.
    getCourseSeries.mockResolvedValue(makeSeries('39', ['2337', '2345']))

    const current = await appendCourseToSeries('39', '2345')

    expect(updateCourseSeries).not.toHaveBeenCalled()
    expect(current.courseIDs).toEqual(['2337', '2345'])
  })
})
