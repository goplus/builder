import type { CourseSeries } from '@/apis/course-series'

export type SeriesOrderUpdate = {
  id: string
  order: number
}

/**
 * Reorder `all` (every series of the author, in their current order) so that the series shown take the places the shown
 * ones had, in the order of `reorderedShown`; series not shown keep their places. The series are then numbered from 1,
 * and `updates` holds only the series whose `order` changes.
 *
 * `order` is shared with the series of other authors, which learners see among these; renumbering moves these series
 * relative to them.
 */
export function planSeriesOrder(all: CourseSeries[], reorderedShown: CourseSeries[]) {
  const shownIDs = new Set(reorderedShown.map((series) => series.id))
  const next = [...all]
  let shownIndex = 0
  for (const [index, series] of all.entries()) {
    if (!shownIDs.has(series.id)) continue
    next[index] = reorderedShown[shownIndex++]
  }
  if (shownIndex !== reorderedShown.length) throw new Error('Reordered series must be among all series')

  const updates: SeriesOrderUpdate[] = []
  const series = next.map((s, index) => {
    const order = index + 1
    if (s.order === order) return s
    updates.push({ id: s.id, order })
    return { ...s, order }
  })
  return { series, updates }
}

/** The `order` for a new series, which comes after all of the author's series. */
export function getNextSeriesOrder(all: CourseSeries[]) {
  return all.reduce((max, series) => Math.max(max, series.order), 0) + 1
}
