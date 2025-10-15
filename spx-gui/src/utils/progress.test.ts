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
  describe('startAutoReport', () => {
    it('should work well', async () => {
      async function checkWithTimes(estimatedTimes: number) {
        const percentages: number[] = []
        const onProgress = vitest.fn((p) => percentages.push(p.percentage))
        const reporter = new ProgressReporter(onProgress)
        const interval = 100
        const maxTimes = estimatedTimes * 2
        await reporter.startAutoReport(interval * estimatedTimes, interval)
        expect([
          maxTimes,
          maxTimes + 1 // There may be little difference due to floating-point-number calculation issue in JS
        ]).includes(onProgress.mock.calls.length)
        for (let i = 0; i < maxTimes; i++) {
          expect(percentages[i]).toBeGreaterThan(0)
          expect(percentages[i]).toBeLessThan(1)
          if (i > 0) expect(percentages[i]).toBeGreaterThan(percentages[i - 1])
        }
      }
      await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(checkWithTimes))
    })
    it('should stop when finished', async () => {
      const onProgress = vitest.fn()
      const reporter = new ProgressReporter(onProgress)
      const autoReportDone = reporter.startAutoReport(5 * 100, 100)
      await timeout(250)
      reporter.report(1)
      await autoReportDone
      expect(onProgress).toHaveBeenCalledTimes(3)
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
