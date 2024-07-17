import { describe, it, expect } from 'vitest'
import { isImage, isSound, nomalizeDegree, memoizeAsync } from './utils'
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
    expect(nomalizeDegree(180)).toBe(-180)
    expect(nomalizeDegree(270)).toBe(-90)
    expect(nomalizeDegree(360)).toBe(0)
    expect(nomalizeDegree(450)).toBe(90)
    expect(nomalizeDegree(720)).toBe(0)
    expect(nomalizeDegree(-90)).toBe(-90)
    expect(nomalizeDegree(-180)).toBe(-180)
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

    expect(await Promise.all([
      fn(1),
      fn(1)
    ])).toEqual([1, 1])
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
    const fn = memoizeAsync(async (a: number, b: number) => {
      const id = ++count
      await sleep(100)
      if (id === 1) throw new Error('test error')
      return a + b
    }, (a, b) => a + b)

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
