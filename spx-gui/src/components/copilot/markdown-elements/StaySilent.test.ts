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

  it('should treat a stay-silent decision with leaked reasoning text as silent', () => {
    expect(isSilentContent('Let me check the current state... <stay-silent />')).toBe(true)
    expect(isSilentContent('<stay-silent /> The user just started.')).toBe(true)
  })

  it('should not treat visible content without stay-silent as silent', () => {
    expect(isSilentContent('Hello')).toBe(false)
    expect(isSilentContent('<highlight-link target-id="x">See</highlight-link>')).toBe(false)
  })
})
