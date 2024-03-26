import { describe, it, expect } from 'vitest'
import { isImage, isSound } from './utils'

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
