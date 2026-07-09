import { describe, expect, it } from 'vitest'
import { isSilentContent } from './StaySilent'

describe('isSilentContent', () => {
  it('should treat stay-silent-only content as silent', () => {
    expect(isSilentContent('<stay-silent />')).toBe(true)
    expect(isSilentContent('<stay-silent/>')).toBe(true)
    expect(isSilentContent('  <stay-silent />\n')).toBe(true)
  })

  it('should treat empty content as silent', () => {
    expect(isSilentContent('')).toBe(true)
    expect(isSilentContent('  \n ')).toBe(true)
  })

  it('should not treat content with other text as silent', () => {
    expect(isSilentContent('Keep going! <stay-silent />')).toBe(false)
    expect(isSilentContent('Hello')).toBe(false)
    expect(isSilentContent('<highlight-link target-id="x">See</highlight-link>')).toBe(false)
  })
})
