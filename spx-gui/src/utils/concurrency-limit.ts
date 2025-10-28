/**
 * @file Concurrency Limit
 * @desc Utility to limit concurrency of async tasks
 */

export class ConcurrencyLimitController {
  constructor(private maxConcurrency: number) {}

  private currentConcurrency = 0
  private waitingQueue: (() => void)[] = []

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.currentConcurrency >= this.maxConcurrency) {
      await new Promise<void>((resolve) => {
        this.waitingQueue.push(resolve)
      })
    }

    this.currentConcurrency++
    try {
      return await task()
    } finally {
      this.currentConcurrency--
      this.processNext()
    }
  }

  private processNext() {
    if (this.currentConcurrency < this.maxConcurrency && this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift()
      next?.()
    }
  }
}
