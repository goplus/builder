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

/**
 * Run `fn` on each item, at most `maxConcurrency` at a time. After a failure no more items are started, and the first
 * error is thrown once the items already started have settled, so that nothing is still running when it is handled.
 */
export async function forEachConcurrently<T>(
  items: readonly T[],
  maxConcurrency: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  const state: { next: number; failure: { error: unknown } | null } = { next: 0, failure: null }
  async function work() {
    while (state.failure == null && state.next < items.length) {
      const index = state.next++
      try {
        await fn(items[index], index)
      } catch (error) {
        state.failure ??= { error }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(maxConcurrency, items.length) }, work))
  if (state.failure != null) throw state.failure.error
}
