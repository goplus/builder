import { nextTick, watch } from 'vue'
import { describe, it, expect, vitest } from 'vitest'
import {
  isImage,
  isSound,
  nomalizeDegree,
  memoizeAsync,
  localStorageRef,
  humanizeListWithLimit,
  humanizeFileSize,
  isCrossOriginUrl,
  withRetry
} from './utils'
import { sleep } from './test'

describe('isImage', () => {
  it('should return true for valid image extensions', () => {
    expect(isImage('example.svg')).toBe(true)
    expect(isImage('example.jpeg')).toBe(true)
    expect(isImage('example.jpg')).toBe(true)
    expect(isImage('example.png')).toBe(true)
  })

  it('should return false for non-image extensions', () => {
    expect(isImage('example.mp3')).toBe(false)
    expect(isImage('example.doc')).toBe(false)
    expect(isImage('example.wav')).toBe(false)
  })

  it('should return false for URLs without an extension', () => {
    expect(isImage('example')).toBe(false)
    expect(isImage('https://example.com/image')).toBe(false)
  })

  // it('should handle URLs with query parameters', () => {
  //   expect(isImage('example.png?version=1.2.3')).toBe(true)
  //   expect(isImage('example.doc?version=1.2.3')).toBe(false)
  // })

  it('should handle URLs with unusual characters', () => {
    expect(isImage('example-image@2x.png')).toBe(true)
    expect(isImage('example.image.png')).toBe(true)
  })
})

describe('isSound', () => {
  it('should return true for valid sound extensions', () => {
    expect(isSound('example.wav')).toBe(true)
    expect(isSound('example.mp3')).toBe(true)
    expect(isSound('example.ogg')).toBe(true)
  })

  it('should return false for non-sound extensions', () => {
    expect(isSound('example.png')).toBe(false)
    expect(isSound('example.doc')).toBe(false)
    expect(isSound('example.jpeg')).toBe(false)
  })

  it('should return false for URLs without an extension', () => {
    expect(isSound('example')).toBe(false)
    expect(isSound('https://example.com/sound')).toBe(false)
  })

  // it('should handle URLs with query parameters', () => {
  //   expect(isSound('example.mp3?version=1.2.3')).toBe(true)
  //   expect(isSound('example.jpeg?version=1.2.3')).toBe(false)
  // })

  it('should handle URLs with unusual characters', () => {
    expect(isSound('example-sound@2x.mp3')).toBe(true)
    expect(isSound('example.sound.mp3')).toBe(true)
  })
})

describe('nomalizeDegree', () => {
  it('should work well', () => {
    expect(nomalizeDegree(0)).toBe(0)
    expect(nomalizeDegree(90)).toBe(90)
    expect(nomalizeDegree(180)).toBe(180)
    expect(nomalizeDegree(270)).toBe(-90)
    expect(nomalizeDegree(360)).toBe(0)
    expect(nomalizeDegree(450)).toBe(90)
    expect(nomalizeDegree(720)).toBe(0)
    expect(nomalizeDegree(-90)).toBe(-90)
    expect(nomalizeDegree(-180)).toBe(180)
    expect(nomalizeDegree(-270)).toBe(90)
    expect(nomalizeDegree(-360)).toBe(0)
    expect(nomalizeDegree(-450)).toBe(-90)
    expect(nomalizeDegree(-720)).toBe(0)
  })
})

describe('memoizeAsync', () => {
  it('should work well', async () => {
    let count = 0
    const fn = memoizeAsync(async (n: number) => {
      count++
      await sleep(100)
      return n
    })

    expect(await Promise.all([fn(1), fn(1)])).toEqual([1, 1])
    expect(await fn(1)).toBe(1)
    expect(await fn(2)).toBe(2)
    expect(await fn(2)).toBe(2)
    expect(count).toBe(2)
  })

  it('should work well with rejected promises', async () => {
    let count = 0
    const fn = memoizeAsync(async (n: number) => {
      const id = ++count
      await sleep(100)
      if (id === 1) throw new Error('test error')
      return n
    })

    const [p1, p2, p3] = [fn(1), fn(1), fn(2)]
    await expect(p1).rejects.toThrow('test error')
    await expect(p2).rejects.toThrow('test error')
    await expect(p3).resolves.toBe(2)

    await expect(fn(1)).resolves.toBe(1)
    await expect(fn(2)).resolves.toBe(2)
    await expect(fn(2)).resolves.toBe(2)
    expect(count).toBe(3)
  })

  it('should work well with resolver', async () => {
    let count = 0
    const fn = memoizeAsync(
      async (a: number, b: number) => {
        const id = ++count
        await sleep(100)
        if (id === 1) throw new Error('test error')
        return a + b
      },
      (a, b) => a + b
    )

    const [p1, p2, p3, p4] = [fn(1, 2), fn(1, 2), fn(2, 1), fn(2, 2)]
    await expect(p1).rejects.toThrow('test error')
    await expect(p2).rejects.toThrow('test error')
    await expect(p3).rejects.toThrow('test error')
    await expect(p4).resolves.toBe(4)

    await expect(fn(1, 2)).resolves.toBe(3)
    await expect(fn(2, 1)).resolves.toBe(3)
    await expect(fn(2, 2)).resolves.toBe(4)
    expect(count).toBe(3)
  })
})

describe('localStorageRef', () => {
  it('should work well', () => {
    const key = 'test-key'
    const stored = localStorageRef(key, 'default-value')
    expect(stored.value).toBe('default-value')
    stored.value = 'new-value'
    expect(stored.value).toBe('new-value')
    expect(localStorage.getItem(key)).toBe('"new-value"')
    stored.value = 'default-value'
    expect(stored.value).toBe('default-value')
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('should sync within the same document', async () => {
    const key = 'test-key'
    const stored1 = localStorageRef(key, 0)
    const stored2 = localStorageRef(key, 0)
    expect(stored1.value).toBe(0)
    expect(stored2.value).toBe(0)

    stored1.value++
    expect(stored1.value).toBe(1)
    expect(stored2.value).toBe(1)
    stored2.value++
    expect(stored1.value).toBe(2)
    expect(stored2.value).toBe(2)

    const onStored1Change = vitest.fn()
    const onStored2Change = vitest.fn()
    watch(stored1, (v) => onStored1Change(v))
    watch(stored2, (v) => onStored2Change(v))
    stored1.value = 3
    await nextTick()
    expect(onStored1Change).toHaveBeenCalledTimes(1)
    expect(onStored1Change).toHaveBeenCalledWith(3)
    expect(onStored2Change).toHaveBeenCalledTimes(1)
    expect(onStored2Change).toHaveBeenCalledWith(3)
    stored2.value = 4
    await nextTick()
    expect(onStored1Change).toHaveBeenCalledTimes(2)
    expect(onStored1Change).toHaveBeenCalledWith(4)
    expect(onStored2Change).toHaveBeenCalledTimes(2)
    expect(onStored2Change).toHaveBeenCalledWith(4)
  })
})

describe('humanizeListWithLimit', () => {
  it('should work well', () => {
    expect(humanizeListWithLimit([{ en: 'A', zh: '甲' }])).toEqual({ en: 'A', zh: '甲' })
    expect(
      humanizeListWithLimit([
        { en: 'A', zh: '甲' },
        { en: 'B', zh: '乙' }
      ])
    ).toEqual({
      en: 'A, B',
      zh: '甲、乙'
    })
    expect(
      humanizeListWithLimit([
        { en: 'A', zh: '甲' },
        { en: 'B', zh: '乙' },
        { en: 'C', zh: '丙' }
      ])
    ).toEqual({
      en: 'A, B, C',
      zh: '甲、乙、丙'
    })
    expect(
      humanizeListWithLimit([
        { en: 'A', zh: '甲' },
        { en: 'B', zh: '乙' },
        { en: 'C', zh: '丙' },
        { en: 'D', zh: '丁' }
      ])
    ).toEqual({
      en: 'A, B, C and 1 more',
      zh: '甲、乙、丙等 4 个'
    })
  })
  it('should work well with limit', () => {
    expect(
      humanizeListWithLimit(
        [
          { en: 'A', zh: '甲' },
          { en: 'B', zh: '乙' },
          { en: 'C', zh: '丙' },
          { en: 'D', zh: '丁' }
        ],
        2
      )
    ).toEqual({
      en: 'A, B and 2 more',
      zh: '甲、乙等 4 个'
    })
  })
})

describe('humanizeFileSize', () => {
  it('should work well', () => {
    expect(humanizeFileSize(0)).toEqual({ en: '0 B', zh: '0 B' })
    expect(humanizeFileSize(1023)).toEqual({ en: '1023 B', zh: '1023 B' })
    expect(humanizeFileSize(1024)).toEqual({ en: '1 KB', zh: '1 KB' })
    expect(humanizeFileSize(2048)).toEqual({ en: '2 KB', zh: '2 KB' })
    expect(humanizeFileSize(1048576)).toEqual({ en: '1 MB', zh: '1 MB' })
    expect(humanizeFileSize(2097152)).toEqual({ en: '2 MB', zh: '2 MB' })
    expect(humanizeFileSize(1073741824)).toEqual({ en: '1 GB', zh: '1 GB' })
    expect(humanizeFileSize(2147483648)).toEqual({ en: '2 GB', zh: '2 GB' })
    expect(humanizeFileSize(1099511627776)).toEqual({ en: '1 TB', zh: '1 TB' })
    expect(humanizeFileSize(10995116277760000)).toEqual({ en: '10000 TB', zh: '10000 TB' })
  })
  it('should round file size correctly', () => {
    expect(humanizeFileSize(1500)).toEqual({ en: '1.46 KB', zh: '1.46 KB' })
    expect(humanizeFileSize(1536)).toEqual({ en: '1.5 KB', zh: '1.5 KB' })
    expect(humanizeFileSize(10485760)).toEqual({ en: '10 MB', zh: '10 MB' })
    expect(humanizeFileSize(10737418240)).toEqual({ en: '10 GB', zh: '10 GB' })
  })
})

describe('isCrossOriginUrl', () => {
  it('should work well', () => {
    expect(isCrossOriginUrl('https://example.com/image.png', 'https://example2.com')).toBe(true)
    expect(isCrossOriginUrl('https://example.com/image.png', 'https://example.com')).toBe(false)
    expect(isCrossOriginUrl('https://example.com/image.png', 'http://example.com')).toBe(true)
    expect(isCrossOriginUrl('https://example.com/image.png', 'https://example.com:8080')).toBe(true)
  })
  it('should handle relative URLs', () => {
    expect(isCrossOriginUrl('/image.png', 'https://example.com')).toBe(false)
    expect(isCrossOriginUrl('image.png', 'https://example.com')).toBe(false)
  })
  it('should work well with object URLs', () => {
    expect(
      isCrossOriginUrl('blob:https://example.com/12345678-1234-1234-1234-123456789012', 'https://example.com')
    ).toBe(false)
    expect(
      isCrossOriginUrl('blob:https://example.com/12345678-1234-1234-1234-123456789012', 'https://example2.com')
    ).toBe(true)
  })
  it('should work well with data URLs', () => {
    expect(isCrossOriginUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA', 'https://example.com')).toBe(false)
    expect(isCrossOriginUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA', 'https://example2.com')).toBe(false)
  })
})

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const mockFn = vitest.fn().mockResolvedValue('success')

    const result = await withRetry(mockFn)

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and eventually succeed', async () => {
    let attemptCount = 0
    const mockFn = vitest.fn().mockImplementation(async () => {
      attemptCount++
      if (attemptCount < 3) {
        throw new Error(`Attempt ${attemptCount} failed`)
      }
      return 'success on third attempt'
    })

    const result = await withRetry(mockFn, 3, 50)

    expect(result).toBe('success on third attempt')
    expect(mockFn).toHaveBeenCalledTimes(3)
  })

  it('should throw error after max retries exceeded', async () => {
    const mockFn = vitest.fn().mockRejectedValue(new Error('persistent failure'))

    await expect(withRetry(mockFn, 2, 50)).rejects.toThrow('persistent failure')
    expect(mockFn).toHaveBeenCalledTimes(3) // initial attempt + 2 retries
  })

  it('should use default maxRetries and delayMs when not specified', async () => {
    const mockFn = vitest.fn().mockRejectedValue(new Error('always fails'))

    const startTime = Date.now()
    await expect(withRetry(mockFn)).rejects.toThrow('always fails')
    const endTime = Date.now()

    expect(mockFn).toHaveBeenCalledTimes(4) // initial attempt + 3 retries (default)
    // Should take at least 3 seconds (3 delays of 1000ms each)
    expect(endTime - startTime).toBeGreaterThan(2900)
  })

  it('should wait specified delay between retries', async () => {
    const mockFn = vitest.fn().mockRejectedValue(new Error('fails'))
    const delayMs = 100

    const startTime = Date.now()
    await expect(withRetry(mockFn, 2, delayMs)).rejects.toThrow('fails')
    const endTime = Date.now()

    expect(mockFn).toHaveBeenCalledTimes(3) // initial + 2 retries
    // Should take at least 2 * delayMs (2 delays)
    expect(endTime - startTime).toBeGreaterThan(delayMs * 2 - 50)
  })

  it('should work with async functions that return different types', async () => {
    const numberFn = vitest.fn().mockResolvedValue(42)
    const objectFn = vitest.fn().mockResolvedValue({ data: 'test' })
    const arrayFn = vitest.fn().mockResolvedValue([1, 2, 3])

    expect(await withRetry(numberFn)).toBe(42)
    expect(await withRetry(objectFn)).toEqual({ data: 'test' })
    expect(await withRetry(arrayFn)).toEqual([1, 2, 3])
  })

  it('should handle functions with parameters', async () => {
    const mockFn = vitest.fn().mockImplementation(async (a: number, b: string) => {
      return `${a}-${b}`
    })

    const wrappedFn = () => mockFn(123, 'test')
    const result = await withRetry(wrappedFn)

    expect(result).toBe('123-test')
    expect(mockFn).toHaveBeenCalledWith(123, 'test')
  })

  it('should handle zero maxRetries', async () => {
    const mockFn = vitest.fn().mockRejectedValue(new Error('immediate failure'))

    await expect(withRetry(mockFn, 0, 50)).rejects.toThrow('immediate failure')
    expect(mockFn).toHaveBeenCalledTimes(1) // only initial attempt, no retries
  })

  it('should handle zero delay', async () => {
    let attemptCount = 0
    const mockFn = vitest.fn().mockImplementation(async () => {
      attemptCount++
      if (attemptCount < 2) {
        throw new Error('first attempt fails')
      }
      return 'success'
    })

    const startTime = Date.now()
    const result = await withRetry(mockFn, 2, 0)
    const endTime = Date.now()

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(2)
    // Should complete quickly with zero delay
    expect(endTime - startTime).toBeLessThan(100)
  })

  it('should handle negative maxRetries by throwing error', async () => {
    const mockFn = vitest.fn().mockRejectedValue(new Error('failure'))
    await expect(withRetry(mockFn, -1, 50)).rejects.toThrow('invalid maxRetries: -1')
    expect(mockFn).toHaveBeenCalledTimes(0) // function never called due to loop condition
  })

  it('should preserve original error types and messages', async () => {
    class CustomError extends Error {
      constructor(
        message: string,
        public code: number
      ) {
        super(message)
        this.name = 'CustomError'
      }
    }

    const mockFn = vitest.fn().mockRejectedValue(new CustomError('custom error message', 500))

    await expect(withRetry(mockFn, 1, 50)).rejects.toMatchObject({
      name: 'CustomError',
      message: 'custom error message',
      code: 500
    })
  })

  it('should work with functions that throw synchronously', async () => {
    const mockFn = vitest.fn().mockImplementation(() => {
      throw new Error('sync error')
    })

    await expect(withRetry(mockFn, 1, 50)).rejects.toThrow('sync error')
    expect(mockFn).toHaveBeenCalledTimes(2) // initial + 1 retry
  })
})
