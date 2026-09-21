import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CourseSeries } from '@/apis/course-series'
import { findSeriesOfCourse, listPlaygroundSeries } from './series'

const { listSignedInUserCourseSeries } = vi.hoisted(() => ({ listSignedInUserCourseSeries: vi.fn() }))

vi.mock('@/apis/course-series', () => ({ listSignedInUserCourseSeries }))

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
})
