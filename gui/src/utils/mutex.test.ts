import { describe, it, expect } from 'vitest'
import { sleep } from './test'
import Mutex from './mutex'

describe('Mutex', () => {
  it('should work well', async () => {
    const mutex = new Mutex()
    const result: string[] = []
    await Promise.all([
      (async () => {
        result.push('1.0')
        const unlock = await mutex.lock()
        result.push('1.1')
        await sleep(500)
        result.push('1.2')
        unlock()
      })(),
      (async () => {
        result.push('2.0')
        const unlock = await mutex.lock()
        result.push('2.1')
        await sleep(500)
        result.push('2.2')
        unlock()
      })(),
      (async () => {
        result.push('3.0')
        const unlock = await mutex.lock()
        result.push('3.1')
        await sleep(500)
        result.push('3.2')
        unlock()
      })()
    ])
    expect(result).toEqual(['1.0', '2.0', '3.0', '1.1', '1.2', '2.1', '2.2', '3.1', '3.2'])
  })
})
