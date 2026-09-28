import { describe, expect, it } from 'vitest'
import { sanitizeInProgressContent, stripThinking } from './content-visibility'

describe('stripThinking', () => {
  it('removes closed thinking blocks including their inner text', () => {
    expect(stripThinking('<thinking>the user is exploring</thinking>Hello!')).toBe('Hello!')
    expect(stripThinking('a<thinking>x</thinking>b<thinking>y</thinking>c')).toBe('abc')
  })

  it('removes an unclosed (still streaming) thinking block to the end', () => {
    expect(stripThinking('Hello!<thinking>let me check the current st')).toBe('Hello!')
  })

  it('leaves content without thinking untouched', () => {
    expect(stripThinking('Just a reply')).toBe('Just a reply')
  })
})

describe('sanitizeInProgressContent', () => {
  it('shows nothing once a stay-silent tag appears', () => {
    expect(sanitizeInProgressContent('The user is exploring <stay-silent />')).toBe('')
    expect(sanitizeInProgressContent('<user-progress-neutral />\n<stay-silent')).toBe('')
  })

  it('hides streaming thinking and holds back a trailing partial tag', () => {
    expect(sanitizeInProgressContent('<thinking>reasoning...')).toBe('')
    expect(sanitizeInProgressContent('Hi <thinki')).toBe('Hi ')
  })

  it('passes normal streaming content through', () => {
    expect(sanitizeInProgressContent('Here is a hint')).toBe('Here is a hint')
  })
})
