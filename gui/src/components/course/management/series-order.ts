import { ConcurrencyLimitController } from '@/utils/concurrency-limit'
import type { CourseSeries } from '@/apis/course-series'
import { placeReordered } from './list-view'

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
  const next = placeReordered(all, reorderedShown, (series) => series.id)

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

/**
 * Write the updates of each reorder, a few at a time, once those of the reorder before it have settled, so that an
 * update left over from one reorder never lands after a later one's. A write resolves to how each update went.
 */
export function createSeriesOrderWriter(
  update: (id: string, order: number) => Promise<unknown>,
  /** How many updates of a reorder are sent at a time. */
  concurrency: number
) {
  const reorders = new ConcurrencyLimitController(1)
  return (updates: SeriesOrderUpdate[]) =>
    reorders.run(() => {
      const limit = new ConcurrencyLimitController(concurrency)
      return Promise.allSettled(updates.map(({ id, order }) => limit.run(() => update(id, order))))
    })
}
