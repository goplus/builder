import type { LocaleMessage } from './i18n'

export type Progress = {
  /** Progress percentage, number in range `[0, 1]` */
  percentage: number
  /** Description for the progress, e.g., "Loading local data..." */
  desc: LocaleMessage | null
}

export type ProgressHandler = (p: Progress) => void

export class ProgressReporter {
  private percentage = 0

  constructor(private handler: ProgressHandler) {}

  report(progress: Progress): void
  report(percentage: number, desc?: LocaleMessage | null): void
  report(arg1: Progress | number, desc: LocaleMessage | null = null) {
    const progress = typeof arg1 === 'number' ? { percentage: arg1, desc } : arg1
    this.percentage = progress.percentage
    this.handler(progress)
  }

  /**
   * Start reporting progress automatically: a series of progress will be reported in given interval.
   * Reports start from `percentage: 0` and keep increasing.
   * Reports stop when `estimatedTimeCost * 2` is reached (at `percentage: 0.99`), or `percentage: 1` is reported manually.
   */
  startAutoReport(
    /** Estimated time cost in milliseconds */
    estimatedTimeCost: number,
    /** Interval in milliseconds for each report */
    interval = 300
  ) {
    return new Promise<void>((resolve) => {
      const estimatedTimes = estimatedTimeCost / interval
      const maxTimes = estimatedTimes * 2
      const maxPercentage = 0.99
      // Quadratic function to generate reports: y = x^2 / (x^2 + factor)
      // when x = maxTimes, y = maxPercentage
      const factor = (maxTimes ** 2 * (1 - maxPercentage)) / maxPercentage
      let times = 0
      const timer = setInterval(() => {
        const curr = this.percentage
        if (curr >= maxPercentage) {
          clearInterval(timer)
          resolve()
          return
        }
        times++
        const timesSquared = times ** 2
        this.report(timesSquared / (timesSquared + factor))
      }, interval)
    })
  }
}

type CollectingItem = {
  progress: Progress
  weight: number
  desc: LocaleMessage | null
}

export type ProgressCollectorInfoForDesc = {
  finishedNum: number
  totalNum: number
}

export type ProgressCollectorDescFn = (info: ProgressCollectorInfoForDesc) => LocaleMessage

export class ProgressCollector {
  private collecting: CollectingItem[] = []
  private handler?: ProgressHandler

  constructor(private descFn?: ProgressCollectorDescFn | null) {}

  /** Creates a new ProgressCollector which collects progress and reports with given reporter. */
  static collectorFor(reporter: ProgressReporter, descFn?: ProgressCollectorDescFn | null) {
    const collector = new ProgressCollector(descFn)
    collector.onProgress((p) => reporter.report(p))
    return collector
  }

  onProgress(handler: ProgressHandler) {
    this.handler = handler
  }

  private getDesc() {
    if (this.descFn == null) return null
    const finishedNum = this.collecting.filter((i) => i.progress.percentage >= 1).length
    const totalNum = this.collecting.length
    return this.descFn({ finishedNum, totalNum })
  }

  private getProgress() {
    let totalWeight = 0
    let finishedWeight = 0
    let currentItem: CollectingItem | null = null
    for (const item of this.collecting) {
      totalWeight += item.weight
      finishedWeight += item.weight * item.progress.percentage
      if (currentItem == null && item.progress.percentage < 1) {
        currentItem = item
      }
    }
    const desc = currentItem?.progress.desc ?? currentItem?.desc ?? this.getDesc()
    const percentage = totalWeight === 0 ? 1 : finishedWeight / totalWeight
    const ret = { percentage, desc }
    if (process.env.NODE_ENV === 'development') {
      Object.assign(ret, { __debug__: this.collecting })
    }
    return ret
  }

  private handleProgressChange() {
    this.handler?.(this.getProgress())
  }

  /** Creates a sub-reporter for a sub-task with given description and weight. */
  getSubReporter(desc: LocaleMessage | null = null, weight = 1) {
    const progress: Progress = { percentage: 0, desc: null }
    const item: CollectingItem = { progress, weight, desc }
    this.collecting.push(item)
    const reporter = new ProgressReporter((p) => {
      item.progress = p
      this.handleProgressChange()
    })
    return reporter
  }
}
