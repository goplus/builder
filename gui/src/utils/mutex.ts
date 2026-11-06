/**
 * @file Mutex for async processing
 */

type Waiting = () => void

export default class Mutex {
  private locked = false
  private waitings: Waiting[] = []

  constructor() {
    this.unlock = this.unlock.bind(this)
  }

  async lock() {
    if (!this.locked) {
      this.locked = true
      return this.unlock
    }
    await new Promise<void>((resolve) => {
      this.waitings.push(resolve)
    })
    return this.unlock
  }

  unlock() {
    if (this.waitings.length === 0) {
      this.locked = false
      return
    }
    const waiting = this.waitings.shift()!
    waiting()
  }

  async runExclusive<T>(job: () => T | Promise<T>): Promise<T> {
    const unlock = await this.lock()
    try {
      return await job()
    } finally {
      unlock()
    }
  }
}
