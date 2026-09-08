import { describe, expect, it } from 'vitest'
import { isAIOperation } from './tracing'

describe('isAIOperation', () => {
  it.each(['ai.think', 'POST /ai-interaction/turns', 'POST /ai-interaction/archives'])('matches %s', (name) => {
    expect(isAIOperation(name)).toBe(true)
  })

  it('does not match unrelated operations', () => {
    expect(isAIOperation('POST /copilot/messages')).toBe(false)
  })
})
