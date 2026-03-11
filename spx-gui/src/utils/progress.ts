import type { LocaleMessage } from './i18n'
import type { PartialBy } from './types'

export type Progress = {
  /** Progress percentage, number in range `[0, 1]` */
  percentage: number
  /** Description for the progress, e.g., "Loading local data..." */
  desc: LocaleMessage | null
  /** Estimated time left in milliseconds, `null` if unknown */
  timeLeft: number | null
}

export type ProgressHandler = (p: Progress) => void

export type ProgressReportParams = PartialBy<Progress, 'timeLeft'>

export class ProgressReporter {
  private percentage = 0

  constructor(
    /** Handler to receive progress reports. */
    private handler: ProgressHandler
  ) {}

  report(progress: ProgressReportParams): void
  report(percentage: number, desc?: LocaleMessage | null): void
  report(arg1: ProgressReportParams | number, desc: LocaleMessage | null = null) {
    let params: ProgressReportParams
    if (typeof arg1 === 'number') {
      params = { percentage: arg1, desc }
    } else {
      params = arg1
    }
    this.percentage = params.percentage
    this.handler({
      percentage: params.percentage,
      desc: params.desc,
      timeLeft: params.timeLeft ?? null
    })
  }

  /**
   * Start reporting progress automatically: a series of progress will be reported in given interval.
   * Reports start from `percentage: 0` and keep increasing.
   * Reports stop when `timeCost` is reached (at `percentage: 0.99`), or `percentage: 1` is reported manually.
   *
   * Both progress percentage and ETA use a linear algorithm so they remain consistent with each other.
   * Percentage reaches 0.99 exactly at the estimated time cost.
   */
  startAutoReport(
    /** Estimated time cost in milliseconds */
    timeCost: number,
    /** Interval in milliseconds for each report. Defaults to `timeCost / 50`. */
    interval = Math.max(300, Math.round(timeCost / 50))
  ) {
    return new Promise<void>((resolve) => {
      const maxPercentage = 0.99
      // Report immediately at percentage: 0
      this.report({ percentage: 0, desc: null, timeLeft: timeCost })
      let times = 0
      const timer = setInterval(() => {
        const curr = this.percentage
        if (curr >= maxPercentage) {
          clearInterval(timer)
          resolve()
          return
        }
        times++
        const elapsed = times * interval
        // Linear function: reaches maxPercentage exactly at estimated time cost
        const percentage = Math.min(maxPercentage, (elapsed / timeCost) * maxPercentage)
        // ETA consistent with linear progress: decreases at wall-clock rate, reaches 0 at timeCost
        const timeLeft = Math.max(0, timeCost - elapsed)
        this.report({ percentage, desc: null, timeLeft })
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

  private getTimeLeft(): number | null {
    // Find the first unfinished sub-task that reports timeLeft
    let sourceItem: CollectingItem | null = null
    for (const item of this.collecting) {
      if (item.progress.percentage < 1 && item.progress.timeLeft != null) {
        sourceItem = item
        break
      }
    }
    if (sourceItem == null) return null
    const sourceTimeLeft = sourceItem.progress.timeLeft
    if (sourceTimeLeft == null) return null
    const remaining = sourceItem.weight * (1 - sourceItem.progress.percentage)
    if (remaining < 1e-9) return null
    // Calculate total remaining weighted progress across all sub-tasks
    let totalRemaining = 0
    for (const item of this.collecting) {
      totalRemaining += item.weight * (1 - item.progress.percentage)
    }
    // Extrapolate: if the source item takes `sourceTimeLeft` for its remaining progress,
    // the total remaining time is proportional
    return sourceTimeLeft * (totalRemaining / remaining)
  }

  private getProgress(): Progress {
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
    const timeLeft = this.getTimeLeft()
    const ret: Progress = { percentage, timeLeft, desc }
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
    const progress: Progress = { percentage: 0, timeLeft: null, desc: null }
    const item: CollectingItem = { progress, weight, desc }
    this.collecting.push(item)
    const reporter = new ProgressReporter((p) => {
      item.progress = p
      this.handleProgressChange()
    })
    return reporter
  }
}
