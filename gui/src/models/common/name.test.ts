import { describe, expect, it } from 'vitest'

import { getValidName } from './name'

describe('getValidName', () => {
  it('increments numeric suffixes while preserving their width', () => {
    expect(getValidName('video02', (name) => name === 'video03')).toBe('video03')
  })

  it('returns the initial name when it is valid', () => {
    expect(getValidName('video', () => true)).toBe('video')
  })

  it('continues a name without a numeric suffix from 2', () => {
    expect(getValidName('video', (name) => name !== 'video')).toBe('video2')
  })

  it('carries over when the suffix is all nines, widening it', () => {
    expect(getValidName('v099', (name) => name === 'v100')).toBe('v100')
    expect(getValidName('v99', (name) => name === 'v100')).toBe('v100')
  })

  it('keeps incrementing past Number.MAX_SAFE_INTEGER', () => {
    // 2^53: as a Number, adding one no longer changes it, which used to loop forever.
    expect(getValidName('9007199254740992', (name) => name !== '9007199254740992')).toBe('9007199254740993')
    expect(getValidName('clip99999999999999999999', (name) => name.endsWith('00000'))).toBe('clip100000000000000000000')
  })

  it('gives up instead of hanging when nothing is ever valid', () => {
    expect(() => getValidName('video', () => false)).toThrow('no valid name found')
  })
})
