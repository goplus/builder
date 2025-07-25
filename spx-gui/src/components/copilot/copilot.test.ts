import { describe, expect, it } from 'vitest'
import { sampleApiMessages } from './copilot'
import type { Message } from '@/apis/copilot'

describe('sampleApiMessages', () => {
  it('should do truncation if the original messages are too long', () => {
    const originalMessages: Message[] = [
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'Hello, how can I help you?'
        }
      },
      {
        role: 'copilot',
        content: {
          type: 'text',
          text: 'I need assistance with my account.'
        }
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'What can you do for me?'
        }
      }
    ]
    const limit = originalMessages[1].content.text.length + originalMessages[2].content.text.length + 10
    const messages = sampleApiMessages(originalMessages, limit)
    expect(messages.length).toBe(2)
    expect(messages[0]).toEqual(originalMessages[1])
    expect(messages[1]).toEqual(originalMessages[2])
  })
})
