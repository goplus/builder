import { afterEach, describe, expect, it, vi } from 'vitest'
import { client } from './common'
import { getCourseSeries, listCourseSeries, listSignedInUserCourseSeries, type CourseSeries } from './course-series'

function makeSeries(kind: CourseSeries['kind']): CourseSeries {
  return {
    id: 'series/a',
    owner: 'teacher',
    kind,
    title: 'Tutorials',
    thumbnail: '',
    description: 'Practice courses',
    courseIDs: ['course-2', 'course-1'],
    units: [],
    order: 1,
    createdAt: '2026-10-13T00:00:00Z',
    updatedAt: '2026-10-13T00:00:00Z'
  }
}

describe('Course Series APIs', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(['guided', 'playground'] as const)(
    'loads a %s series with an encoded ID and ordered course IDs',
    async (kind) => {
      const series = makeSeries(kind)
      const get = vi.spyOn(client, 'get').mockResolvedValue(series)
      const signal = new AbortController().signal
      await expect(getCourseSeries(series.id, signal)).resolves.toEqual(series)
      expect(get).toHaveBeenCalledWith('/course-series/series%2Fa', undefined, { signal })
    }
  )

  it.each([
    { list: listCourseSeries, path: '/course-series' },
    { list: listSignedInUserCourseSeries, path: '/user/course-series' }
  ])('loads a page from $path with both series kinds', async ({ list, path }) => {
    const result = { total: 10, data: [makeSeries('guided'), makeSeries('playground')] }
    const get = vi.spyOn(client, 'get').mockResolvedValue(result)
    const signal = new AbortController().signal
    const params = { pageIndex: 2, pageSize: 2, orderBy: 'order' as const, sortOrder: 'asc' as const }
    await expect(list(params, signal)).resolves.toEqual(result)
    expect(get).toHaveBeenCalledWith(path, params, { signal })
  })
})
