import { describe, expect, it } from 'vitest'
import type { CourseSeries } from '@/apis/course-series'
import { createSeriesOrderWriter, getNextSeriesOrder, planSeriesOrder } from './series-order'

function makeSeries(id: string, order: number, kind: CourseSeries['kind'] = 'guided') {
  return { id, order, kind, title: `Series ${id}` } as CourseSeries
}

function ids(series: CourseSeries[]) {
  return series.map((s) => s.id)
}

describe('planSeriesOrder', () => {
  it('numbers the series from 1 in their new order, updating only those that change', () => {
    const all = [makeSeries('a', 1), makeSeries('b', 2), makeSeries('c', 3)]

    const { series, updates } = planSeriesOrder(all, [all[0], all[2], all[1]])

    expect(ids(series)).toEqual(['a', 'c', 'b'])
    expect(series.map((s) => s.order)).toEqual([1, 2, 3])
    expect(updates).toEqual([
      { id: 'c', order: 2 },
      { id: 'b', order: 3 }
    ])
  })

  it('keeps series that are not shown in their places', () => {
    const all = [
      makeSeries('g1', 1),
      makeSeries('p1', 2, 'playground'),
      makeSeries('g2', 3),
      makeSeries('p2', 4, 'playground'),
      makeSeries('g3', 5)
    ]
    const shownGuided = [all[4], all[0], all[2]]

    const { series, updates } = planSeriesOrder(all, shownGuided)

    expect(ids(series)).toEqual(['g3', 'p1', 'g1', 'p2', 'g2'])
    expect(updates).toEqual([
      { id: 'g3', order: 1 },
      { id: 'g1', order: 3 },
      { id: 'g2', order: 5 }
    ])
  })

  it('renumbers orders that repeat or are below 1', () => {
    const all = [makeSeries('a', -1), makeSeries('b', 1), makeSeries('c', 1)]

    const { updates } = planSeriesOrder(all, [all[1], all[0], all[2]])

    // "b" already has 1.
    expect(updates).toEqual([
      { id: 'a', order: 2 },
      { id: 'c', order: 3 }
    ])
  })

  it('does not change the given series', () => {
    const all = [makeSeries('a', 1), makeSeries('b', 2)]

    planSeriesOrder(all, [all[1], all[0]])

    expect(all.map((s) => s.order)).toEqual([1, 2])
  })

  it('refuses series that are not among all series', () => {
    const all = [makeSeries('a', 1)]

    expect(() => planSeriesOrder(all, [makeSeries('x', 1)])).toThrow()
  })
})

describe('getNextSeriesOrder', () => {
  it('comes after every series', () => {
    expect(getNextSeriesOrder([makeSeries('a', 3), makeSeries('b', 7), makeSeries('c', -1)])).toBe(8)
  })

  it('is 1 without series', () => {
    expect(getNextSeriesOrder([])).toBe(1)
  })
})

describe('createSeriesOrderWriter', () => {
  function deferred() {
    let resolve!: () => void
    let reject!: (e: unknown) => void
    const promise = new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }

  it('starts the updates of a reorder once those of the one before have settled', async () => {
    const pending = new Map<string, ReturnType<typeof deferred>>()
    const sent: string[] = []
    const write = createSeriesOrderWriter((id, order) => {
      const key = `${id}:${order}`
      sent.push(key)
      const d = deferred()
      pending.set(key, d)
      return d.promise
    }, 2)

    const first = write([
      { id: 'a', order: 1 },
      { id: 'b', order: 2 },
      { id: 'c', order: 3 }
    ])
    const second = write([
      { id: 'c', order: 1 },
      { id: 'a', order: 3 }
    ])
    await Promise.resolve()
    expect(sent).toEqual(['a:1', 'b:2'])

    pending.get('a:1')!.resolve()
    await new Promise((r) => setTimeout(r))
    expect(sent).toEqual(['a:1', 'b:2', 'c:3'])
    pending.get('b:2')!.reject(new Error('lost'))
    pending.get('c:3')!.resolve()
    const firstResults = await first
    expect(firstResults.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled'])

    await new Promise((r) => setTimeout(r))
    expect(sent).toEqual(['a:1', 'b:2', 'c:3', 'c:1', 'a:3'])
    pending.get('c:1')!.resolve()
    pending.get('a:3')!.resolve()
    expect((await second).every((r) => r.status === 'fulfilled')).toBe(true)
  })
})
