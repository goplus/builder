import { nextTick, watch } from 'vue'
import { describe, it, expect, vitest } from 'vitest'
import {
  isImage,
  isSound,
  nomalizeDegree,
  memoizeAsync,
  localStorageRef,
  humanizeListWithLimit,
  humanizeFileSize
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
