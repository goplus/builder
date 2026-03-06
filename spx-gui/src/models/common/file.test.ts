import { describe, it, expect, vi } from 'vitest'
import { timeout } from '@/utils/utils'
import { File } from './file'

function makeAB(text = Math.random() + '') {
  return new TextEncoder().encode(text).buffer
}

function makeLoader() {
  let loaderCallCount = 0
  let loaderAborted = false
  let resolve!: (value: ArrayBuffer) => void
  let reject!: (reason?: unknown) => void
  let promise: Promise<ArrayBuffer>
  const fn = (signal?: AbortSignal) => {
    loaderAborted = false
    loaderCallCount++
    promise = new Promise<ArrayBuffer>((rs, rj) => {
      resolve = rs
      reject = rj
    })
    signal?.addEventListener('abort', () => {
      loaderAborted = true
      reject(signal.reason)
    })
    return promise
  }
  return {
    fn,
    get callCount() {
      return loaderCallCount
    },
    get aborted() {
      return loaderAborted
    },
    get promise() {
      return promise
    },
    get resolve() {
      return resolve
    },
    get reject() {
      return reject
    }
  }
}

describe('File', () => {
  describe('arrayBuffer with concurrent calls and signal abortion', () => {
    it('should handle single call', async () => {
      const ab = makeAB()
      const file = new File('test.txt', async () => ab)
      await expect(file.arrayBuffer()).resolves.toBe(ab)
    })
    it('should handle single call with exception', async () => {
      const loader = makeLoader()
      const file = new File('test.txt', loader.fn)
      const promise = file.arrayBuffer()
      loader.reject(new Error('load error'))
      await expect(promise).rejects.toThrow('load error')
    })
    it('should handle single call with abortion', async () => {
      const loader = makeLoader()
      const file = new File('test.txt', loader.fn)
      const ctrl = new AbortController()
      const promise = file.arrayBuffer(ctrl.signal)

      await timeout(50)
      ctrl.abort(new Error('aborted'))
      loader.resolve(makeAB())

      expect(loader.aborted).toBe(true)
      await expect(promise).rejects.toThrow('aborted')
    })
    it('should handle single call with abortion after resolving', async () => {
      const loader = makeLoader()
      const file = new File('test.txt', loader.fn)
      const ctrl = new AbortController()
      const promise = file.arrayBuffer(ctrl.signal)

      const ab = makeAB()
      loader.resolve(ab)
      await timeout(50)
      ctrl.abort(new Error('aborted'))

      await expect(promise).resolves.toBe(ab)
    })
    it('should handle single call with abortion after rejection', async () => {
      const loader = makeLoader()
      const file = new File('test.txt', loader.fn)
      const ctrl = new AbortController()
      const promise = file.arrayBuffer(ctrl.signal)

      const assertion = expect(promise).rejects.toThrow('load error')

      loader.reject(new Error('load error'))
      await timeout(50)
      ctrl.abort(new Error('aborted'))
      await assertion
    })
    it('should handle multiple non-concurrent calls', async () => {
      const loader = makeLoader()
      const file = new File('test.txt', loader.fn)

      const promise1 = file.arrayBuffer()
      const ab = makeAB('first')
      loader.resolve(ab)
      await expect(promise1).resolves.toBe(ab)

      const promise2 = file.arrayBuffer()
      await expect(promise2).resolves.toBe(ab)

      expect(loader.callCount).toBe(1)
    })
    it('should handle multiple non-concurrent calls with exception', async () => {
      const loader = makeLoader()
      const file = new File('test.txt', loader.fn)

      const promise1 = file.arrayBuffer()
      loader.reject(new Error('load error'))
      await expect(promise1).rejects.toThrow('load error')

      const promise2 = file.arrayBuffer()
      const ab = makeAB('second')
      loader.resolve(ab)
      await expect(promise2).resolves.toBe(ab)

      expect(loader.callCount).toBe(2)
    })
    it('should handle multiple concurrent calls', async () => {
      const loader = makeLoader()
      const file = new File('test.txt', loader.fn)
      const promise1 = file.arrayBuffer()
      const promise2 = file.arrayBuffer()
      await timeout(50)
      const promise3 = file.arrayBuffer()

      await timeout(50)
      const ab = makeAB('concurrent')
      loader.resolve(ab)
      await expect(promise1).resolves.toBe(ab)
      await expect(promise2).resolves.toBe(ab)
      await expect(promise3).resolves.toBe(ab)

      expect(loader.callCount).toBe(1)
    })
    it('should handle multiple concurrent calls with one aborted', async () => {
      const loader = makeLoader()
      const file = new File('test.txt', loader.fn)
      const ctrl1 = new AbortController()
      const promise1 = file.arrayBuffer(ctrl1.signal)
      const promise2 = file.arrayBuffer()
      await timeout(50)
      const promise3 = file.arrayBuffer()

      await timeout(50)
      ctrl1.abort(new Error('aborted'))
      const ab = makeAB('concurrent with abortion')
      loader.resolve(ab)

      expect(loader.aborted).toBe(false)
      await expect(promise1).rejects.toThrow('aborted')
      await expect(promise2).resolves.toBe(ab)
      await expect(promise3).resolves.toBe(ab)

      expect(loader.callCount).toBe(1)
    })
    it('should handle multiple concurrent calls with all aborted', async () => {
      const loader = makeLoader()
      const file = new File('test.txt', loader.fn)
      const ctrl1 = new AbortController()
      const promise1 = file.arrayBuffer(ctrl1.signal)
      const ctrl2 = new AbortController()
      const promise2 = file.arrayBuffer(ctrl2.signal)
      await timeout(50)
      const ctrl3 = new AbortController()
      const promise3 = file.arrayBuffer(ctrl3.signal)

      await timeout(50)
      ctrl1.abort(new Error('aborted 1'))
      ctrl2.abort(new Error('aborted 2'))
      ctrl3.abort(new Error('aborted 3'))

      expect(loader.aborted).toBe(true)
      await expect(promise1).rejects.toThrow('aborted 1')
      await expect(promise2).rejects.toThrow('aborted 2')
      await expect(promise3).rejects.toThrow('aborted 3')

      expect(loader.callCount).toBe(1)
    })
    it('should load well after all concurrent calls aborted with loader not responding to signal in time', async () => {
      const ab = makeAB('test')
      const loader = vi.fn(async (signal?: AbortSignal) => {
        // Though the signal will be aborted in 50ms, the loader won't respond to it until 200ms,
        // which simulates the case where the loader is not responsive to signal in time
        await timeout(200)
        signal?.throwIfAborted()
        return ab
      })
      const file = new File('test.txt', loader)
      const ctrl1 = new AbortController()
      const assertion1 = expect(file.arrayBuffer(ctrl1.signal)).rejects.toThrow('aborted 1')
      const ctrl2 = new AbortController()
      const assertion2 = expect(file.arrayBuffer(ctrl2.signal)).rejects.toThrow('aborted 2')
      await timeout(50)
      const ctrl3 = new AbortController()
      const assertion3 = expect(file.arrayBuffer(ctrl3.signal)).rejects.toThrow('aborted 3')

      await timeout(50)
      ctrl1.abort(new Error('aborted 1'))
      ctrl2.abort(new Error('aborted 2'))
      ctrl3.abort(new Error('aborted 3'))

      // The aborted calls should not cause following calls to be aborted
      // await timeout(50)
      const assertion4 = expect(file.arrayBuffer()).resolves.toBe(ab)
      expect(loader).toHaveBeenCalledTimes(2)
      await timeout(50)
      const assertion5 = expect(file.arrayBuffer()).resolves.toBe(ab)
      await Promise.all([assertion1, assertion2, assertion3, assertion4, assertion5])
      expect(loader).toHaveBeenCalledTimes(2)
    })
  })
})
