import { describe, expect, it } from 'vitest'
import { parseProgressVerdict, progressElements } from './user-progress'

describe('parseProgressVerdict', () => {
  it('reads each verdict tag', () => {
    expect(parseProgressVerdict('<user-progress-ahead />')).toBe('ahead')
    expect(parseProgressVerdict('<user-progress-neutral />')).toBe('neutral')
    expect(parseProgressVerdict('<user-progress-back />')).toBe('back')
  })

  it('returns null when no verdict is present', () => {
    expect(parseProgressVerdict('just some guidance text')).toBeNull()
    expect(parseProgressVerdict('')).toBeNull()
  })

  it('lets the most cautious verdict win when several are present', () => {
    expect(parseProgressVerdict('<user-progress-ahead /><user-progress-back />')).toBe('back')
    expect(parseProgressVerdict('<user-progress-ahead /><user-progress-neutral />')).toBe('neutral')
  })

  it('reads a verdict alongside visible guidance in the same reply', () => {
    expect(parseProgressVerdict('<guide-modal>hint</guide-modal><user-progress-neutral />')).toBe('neutral')
  })
})

describe('progress elements', () => {
  it('are all invisible, so a lone verdict is a silent round', () => {
    expect(progressElements.every((e) => e.invisible === true)).toBe(true)
  })
})
