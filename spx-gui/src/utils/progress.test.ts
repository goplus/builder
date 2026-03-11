import { describe, expect, it, vitest } from 'vitest'
import { ProgressCollector, ProgressReporter } from './progress'
import { timeout } from './utils'

describe('ProgressReporter', () => {
  it('should report progress well', () => {
    const onProgress = vitest.fn()
    const reporter = new ProgressReporter(onProgress)
    reporter.report(0.1, { en: 'foo', zh: 'foo' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.1, desc: { en: 'foo', zh: 'foo' } })
    reporter.report(0.2, { en: 'bar', zh: 'bar' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.2, desc: { en: 'bar', zh: 'bar' } })

    onProgress.mockClear()
    reporter.report(0.3, { en: 'baz', zh: 'baz' })
    reporter.report(0.4, { en: 'qux', zh: 'qux' })
    expect(onProgress).toHaveBeenCalledTimes(2)

    reporter.report(0.5)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.5, desc: null })
    reporter.report(0.8, { en: 'quux', zh: 'quux' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.8, desc: { en: 'quux', zh: 'quux' } })
  })

  it('should report timeLeft as null by default', () => {
    const onProgress = vitest.fn()
    const reporter = new ProgressReporter(onProgress)
    reporter.report(0.5, { en: 'foo', zh: 'foo' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({
      percentage: 0.5,
      desc: { en: 'foo', zh: 'foo' },
      timeLeft: null
    })
  })

  it('should report timeLeft when provided', () => {
    const onProgress = vitest.fn()
    const reporter = new ProgressReporter(onProgress)
    reporter.report({ percentage: 0.3, desc: null, timeLeft: 5000 })
    expect(onProgress.mock.lastCall![0]).toMatchObject({
      percentage: 0.3,
      desc: null,
      timeLeft: 5000
    })
    reporter.report(0.8, { en: 'bar', zh: 'bar' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({
      percentage: 0.8,
      desc: { en: 'bar', zh: 'bar' },
      timeLeft: null
    })
  })

  it('should pass through timeLeft when reporting with object', () => {
    const onProgress = vitest.fn()
    const reporter = new ProgressReporter(onProgress)
    reporter.report({ percentage: 0.5, desc: { en: 'foo', zh: 'foo' }, timeLeft: 3000 })
    expect(onProgress.mock.lastCall![0]).toMatchObject({
      percentage: 0.5,
      desc: { en: 'foo', zh: 'foo' },
      timeLeft: 3000
    })
  })

  describe('startAutoReport', () => {
    it('should work well', async () => {
      async function checkWithTimes(estimatedTimes: number) {
        const percentages: number[] = []
        const onProgress = vitest.fn((p) => percentages.push(p.percentage))
        const interval = 100
        const reporter = new ProgressReporter(onProgress)
        await reporter.startAutoReport(interval * estimatedTimes, interval)
        // Stops after reaching 0.99 at estimatedTimes ticks, so total = initial + estimatedTimes
        expect([
          estimatedTimes + 1,
          estimatedTimes + 2 // There may be little difference due to floating-point-number calculation issue in JS
        ]).includes(onProgress.mock.calls.length)
        // percentages[0] is the immediate initial report (percentage: 0)
        expect(percentages[0]).toBe(0)
        for (let i = 1; i <= estimatedTimes; i++) {
          expect(percentages[i]).toBeGreaterThan(0)
          expect(percentages[i]).toBeLessThan(1)
          if (i > 1) expect(percentages[i]).toBeGreaterThan(percentages[i - 1])
        }
        // At estimated time cost, percentage must reach exactly 0.99
        expect(percentages[estimatedTimes]).toBeCloseTo(0.99)
      }
      await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(checkWithTimes))
    })
    it('should report strictly decreasing timeLeft consistent with linear progress', async () => {
      const timeCost = 500
      const interval = 100
      const onProgress = vitest.fn()
      const reporter = new ProgressReporter(onProgress)
      await reporter.startAutoReport(timeCost, interval)
      const reports: { percentage: number; timeLeft: number }[] = onProgress.mock.calls.map(([p]) => p)
      expect(reports.length).toBeGreaterThan(0)
      // First report should be at percentage 0 with timeCost as timeLeft
      expect(reports[0].percentage).toBe(0)
      expect(reports[0].timeLeft).toBe(timeCost)
      for (let i = 1; i < reports.length; i++) {
        const { percentage, timeLeft } = reports[i]
        // timeLeft derived from percentage: timeCost * (1 - percentage)
        expect(timeLeft).toBeGreaterThan(0)
        expect(timeLeft).toBeLessThanOrEqual(timeCost)
        // timeLeft should strictly decrease
        expect(timeLeft).toBeLessThan(reports[i - 1].timeLeft)
        // progress and ETA are consistent: percentage + timeLeft / timeCost ≈ 1
        expect(percentage + timeLeft / timeCost).toBeCloseTo(1)
      }
      // At estimated time cost, percentage should reach 0.99 and timeLeft = timeCost * (1 - 0.99)
      const lastReport = reports[reports.length - 1]
      expect(lastReport.percentage).toBeCloseTo(0.99)
      expect(lastReport.timeLeft).toBeCloseTo(timeCost * (1 - 0.99))
    })
    it('should stop when finished', async () => {
      const onProgress = vitest.fn()
      const reporter = new ProgressReporter(onProgress)
      const autoReportDone = reporter.startAutoReport(5 * 100, 100)
      await timeout(250)
      reporter.report(1)
      await autoReportDone
      expect(onProgress).toHaveBeenCalledTimes(4)
    })
  })
})

describe('ProgressCollector', () => {
  it('should collect progress well', () => {
    const onProgress = vitest.fn()
    const collector = new ProgressCollector()
    collector.onProgress(onProgress)
    const subReporter = collector.getSubReporter()
    const subReporter2 = collector.getSubReporter({ en: '2', zh: '2' })

    subReporter.report(0.1, { en: 'foo', zh: 'foo' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.05, desc: { en: 'foo', zh: 'foo' } })

    subReporter.report(0.6, null)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.3, desc: null })

    subReporter2.report(0.2, { en: 'bar', zh: 'bar' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.4, desc: null })

    subReporter.report(1, null)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.6, desc: { en: 'bar', zh: 'bar' } })

    subReporter2.report(0.6, null)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.8, desc: { en: '2', zh: '2' } })

    subReporter2.report(1, { en: 'baz', zh: 'baz' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 1, desc: null })
  })

  it('should collect progress well with descBase', () => {
    const onProgress = vitest.fn()
    const collector = new ProgressCollector((info) => ({
      en: `base (${info.finishedNum}/${info.totalNum})`,
      zh: `base（${info.finishedNum}/${info.totalNum}）`
    }))
    collector.onProgress(onProgress)
    const subReporter = collector.getSubReporter()
    const subReporter2 = collector.getSubReporter({ en: '2', zh: '2' })
    const subReporter3 = collector.getSubReporter()

    subReporter.report(0.9, { en: 'foo', zh: 'foo' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.3, desc: { en: 'foo', zh: 'foo' } })

    subReporter.report(0.9, null)
    expect(onProgress.mock.lastCall![0]).toMatchObject({
      percentage: 0.3,
      desc: { en: 'base (0/3)', zh: 'base（0/3）' }
    })

    subReporter.report(1)
    subReporter2.report(0.5, { en: 'bar', zh: 'bar' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.5, desc: { en: 'bar', zh: 'bar' } })

    subReporter2.report(1)
    subReporter3.report(0.7)
    expect(onProgress.mock.lastCall![0]).toMatchObject({
      percentage: 0.9,
      desc: { en: 'base (2/3)', zh: 'base（2/3）' }
    })
  })

  it('should collect progress well with weight', () => {
    const onProgress = vitest.fn()
    const collector = new ProgressCollector()
    collector.onProgress(onProgress)
    const subReporter = collector.getSubReporter(null, 1)
    const subReporter2 = collector.getSubReporter(null, 3)

    subReporter.report(0.6)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.15, desc: null })

    subReporter2.report(0.6)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.6, desc: null })

    subReporter2.report(1)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.9, desc: null })

    subReporter.report(1)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 1, desc: null })
  })

  it('should use weight for percentage calculation', () => {
    const onProgress = vitest.fn()
    const collector = new ProgressCollector()
    collector.onProgress(onProgress)
    const subReporter1 = collector.getSubReporter(null, 1)
    const subReporter2 = collector.getSubReporter(null, 3)

    subReporter1.report(1)
    // 1 / 4 = 0.25
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.25 })

    subReporter2.report(1)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 1 })
  })

  it('should aggregate timeLeft from sub-tasks', () => {
    const onProgress = vitest.fn()
    const collector = new ProgressCollector()
    collector.onProgress(onProgress)

    const sub1 = collector.getSubReporter(null, 1)
    const sub2 = collector.getSubReporter(null, 1)

    // sub1 reports timeLeft
    sub1.report({ percentage: 0.5, desc: null, timeLeft: 2000 })
    // sub1 remaining: 1 * 0.5 = 0.5, sub2 remaining: 1 * 1 = 1, total remaining: 1.5
    // timeLeft = 2000 * (1.5 / 0.5) = 6000
    expect(onProgress.mock.lastCall![0].timeLeft).toBe(6000)

    sub1.report(1)
    // sub1 finished, no unfinished sub-task reports timeLeft
    expect(onProgress.mock.lastCall![0].timeLeft).toBe(null)

    sub2.report({ percentage: 0.5, desc: null, timeLeft: 1000 })
    // sub2 remaining: 1 * 0.5 = 0.5, total remaining: 0.5
    // timeLeft = 1000 * (0.5 / 0.5) = 1000
    expect(onProgress.mock.lastCall![0].timeLeft).toBe(1000)
  })

  it('should aggregate timeLeft with different weights', () => {
    const onProgress = vitest.fn()
    const collector = new ProgressCollector()
    collector.onProgress(onProgress)

    const sub1 = collector.getSubReporter(null, 1)
    collector.getSubReporter(null, 3)

    // sub1 at 50% with timeLeft=1000
    sub1.report({ percentage: 0.5, desc: null, timeLeft: 1000 })
    // sub1 remaining: 1 * 0.5 = 0.5, sub2 remaining: 3 * 1 = 3, total remaining: 3.5
    // timeLeft = 1000 * (3.5 / 0.5) = 7000
    expect(onProgress.mock.lastCall![0].timeLeft).toBe(7000)
  })

  it('should collect progress well with nested collector', () => {
    const onProgress = vitest.fn()
    const collector = new ProgressCollector()
    collector.onProgress(onProgress)
    const subReporter1 = collector.getSubReporter()
    const subReporter2 = collector.getSubReporter()
    const subCollector1 = ProgressCollector.collectorFor(subReporter1)
    const subReporter11 = subCollector1.getSubReporter()
    const subReporter12 = subCollector1.getSubReporter()
    const subCollector2 = ProgressCollector.collectorFor(subReporter2)
    const subReporter21 = subCollector2.getSubReporter()
    const subReporter22 = subCollector2.getSubReporter()

    subReporter11.report(0.2, { en: 'foo', zh: 'foo' })
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.05, desc: { en: 'foo', zh: 'foo' } })

    subReporter12.report(0.6)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.2, desc: { en: 'foo', zh: 'foo' } })

    subReporter21.report(0.2, { en: 'bar', zh: 'bar' })
    subReporter22.report(1)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.5, desc: { en: 'foo', zh: 'foo' } })

    subReporter11.report(1)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.7, desc: null })

    subReporter12.report(1)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.8, desc: { en: 'bar', zh: 'bar' } })

    subReporter21.report(1)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 1, desc: null })
  })

  it('should aggregate percentage with nested collectors using weights', () => {
    const onProgress = vitest.fn()
    const collector = new ProgressCollector()
    collector.onProgress(onProgress)
    const subReporter1 = collector.getSubReporter(null, 1)
    const subReporter2 = collector.getSubReporter(null, 1)
    const subCollector1 = ProgressCollector.collectorFor(subReporter1)
    const sub11 = subCollector1.getSubReporter(null, 1)
    const sub12 = subCollector1.getSubReporter(null, 1)

    sub11.report(1)
    // sub11 done: 1/(1+1)=0.5 for subReporter1, percentage = 0.5 * 1 / (1+1) = 0.25
    expect(onProgress.mock.lastCall![0].percentage).toBeCloseTo(0.25)

    sub12.report(1)
    // subReporter1 fully done: 1/(1+1) = 0.5
    expect(onProgress.mock.lastCall![0].percentage).toBeCloseTo(0.5)

    subReporter2.report(1)
    expect(onProgress.mock.lastCall![0]).toMatchObject({ percentage: 1 })
  })

  describe('collectorFor', () => {
    it('should work well', () => {
      const onReporterProgress = vitest.fn()
      const reporter = new ProgressReporter(onReporterProgress)

      const collector = ProgressCollector.collectorFor(reporter)
      expect(collector).toBeInstanceOf(ProgressCollector)

      const subReporter = collector.getSubReporter()
      subReporter.report(0.5, null)
      expect(onReporterProgress.mock.lastCall![0]).toMatchObject({ percentage: 0.5, desc: null })
    })
    it('should work well with baseDesc', () => {
      const onReporterProgress = vitest.fn()
      const reporter = new ProgressReporter(onReporterProgress)

      const collector = ProgressCollector.collectorFor(reporter, (info) => ({
        en: `base (${info.finishedNum}/${info.totalNum})`,
        zh: `base（${info.finishedNum}/${info.totalNum}）`
      }))
      expect(collector).toBeInstanceOf(ProgressCollector)

      const subReporter = collector.getSubReporter()
      subReporter.report(0.5, null)
      expect(onReporterProgress.mock.lastCall![0]).toMatchObject({
        percentage: 0.5,
        desc: { en: 'base (0/1)', zh: 'base（0/1）' }
      })
    })
    it('should work well with collectorFor called multiple times', () => {
      const onReporterProgress = vitest.fn()
      const reporter = new ProgressReporter(onReporterProgress)

      const collector1 = ProgressCollector.collectorFor(reporter, (info) => ({
        en: `base1 (${info.finishedNum}/${info.totalNum})`,
        zh: `base1（${info.finishedNum}/${info.totalNum}）`
      }))
      collector1.getSubReporter().report(0.5, null)
      collector1.getSubReporter().report(0.5, null)

      const collector2 = ProgressCollector.collectorFor(reporter, (info) => ({
        en: `base2 (${info.finishedNum}/${info.totalNum})`,
        zh: `base2（${info.finishedNum}/${info.totalNum}）`
      }))
      const subReporter1 = collector2.getSubReporter()
      const subReporter2 = collector2.getSubReporter()

      subReporter1.report(0.5, null)
      expect(onReporterProgress.mock.lastCall![0]).toMatchObject({
        percentage: 0.25,
        desc: { en: 'base2 (0/2)', zh: 'base2（0/2）' }
      })

      subReporter1.report(1, null)
      subReporter2.report(0.5, null)
      expect(onReporterProgress.mock.lastCall![0]).toMatchObject({
        percentage: 0.75,
        desc: { en: 'base2 (1/2)', zh: 'base2（1/2）' }
      })
    })
  })
})
