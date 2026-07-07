import { describe, expect, it } from 'vitest'
import type { MessageEvent } from '@/apis/copilot'
import { createLocalPreviewCopilotGenerator } from './local-preview-generator'

async function collectEvents(events: AsyncIterableIterator<MessageEvent>) {
  const result: MessageEvent[] = []
  for await (const event of events) result.push(event)
  return result
}

describe('local preview copilot generator', () => {
  it('streams a local walkthrough response without calling the remote API', async () => {
    const generator = createLocalPreviewCopilotGenerator()

    const events = await collectEvents(
      generator.generateCopilotMessage([
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Fix the current problem'
          }
        }
      ])
    )

    expect(events).toEqual([
      {
        type: 'text_delta',
        data: {
          text: expect.stringContaining('本地预览模式')
        }
      },
      {
        type: 'done',
        data: {
          finishReason: 'stop'
        }
      }
    ])
  })

  it('streams tutorial guidance when the current session is a course', async () => {
    const generator = createLocalPreviewCopilotGenerator()

    const events = await collectEvents(
      generator.generateCopilotMessage([
        {
          role: 'user',
          content: {
            type: 'text',
            text: '<course><course-title>Coding-Course-3</course-title></course>'
          }
        }
      ])
    )

    expect(events[0]).toEqual({
      type: 'text_delta',
      data: {
        text: expect.stringContaining('教程 Copilot')
      }
    })
  })
})
