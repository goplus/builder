import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JSONSSEEvent } from './common/client'
import { client } from './common'
import { ToolType, generateSSEMessage, type MessageEvent, type Tool } from './copilot'

vi.mock('./common', () => ({
  client: {
    postJSONSSE: vi.fn()
  }
}))

function createJSONSSEStream(events: JSONSSEEvent[]): AsyncGenerator<JSONSSEEvent> {
  return (async function* () {
    for (const event of events) {
      yield event
    }
  })()
}

async function collectMessageEvents(stream: AsyncIterableIterator<MessageEvent>) {
  const events: MessageEvent[] = []
  for await (const event of stream) {
    events.push(event)
  }
  return events
}

describe('generateSSEMessage', () => {
  const mockedPostJSONSSE = vi.mocked(client.postJSONSSE)

  beforeEach(() => {
    mockedPostJSONSSE.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should stop streaming after a done event', async () => {
    mockedPostJSONSSE.mockReturnValue(
      createJSONSSEStream([
        {
          type: 'text_delta',
          data: {
            text: 'hello'
          }
        },
        {
          type: 'done',
          data: {
            finishReason: 'stop'
          }
        },
        {
          type: 'text_delta',
          data: {
            text: 'ignored'
          }
        }
      ])
    )

    const events = await collectMessageEvents(generateSSEMessage('standard', []))

    expect(events).toEqual([
      {
        type: 'text_delta',
        data: {
          text: 'hello'
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

  it('should stop streaming after an error event', async () => {
    mockedPostJSONSSE.mockReturnValue(
      createJSONSSEStream([
        {
          type: 'text_delta',
          data: {
            text: 'partial'
          }
        },
        {
          type: 'error',
          data: {
            reason: 'streamFailed',
            message: 'stream failed'
          }
        },
        {
          type: 'done',
          data: {
            finishReason: 'stop'
          }
        }
      ])
    )

    const events = await collectMessageEvents(generateSSEMessage('standard', []))

    expect(events).toEqual([
      {
        type: 'text_delta',
        data: {
          text: 'partial'
        }
      },
      {
        type: 'error',
        data: {
          reason: 'streamFailed',
          message: 'stream failed'
        }
      }
    ])
  })

  it('should send tool definitions in the SSE request payload', async () => {
    const tools: Tool[] = [
      {
        type: ToolType.Function,
        function: {
          name: 'list_projects',
          description: 'List projects matching the query.',
          parameters: {
            type: 'object',
            required: ['query'],
            properties: {
              query: {
                type: 'string'
              }
            }
          }
        }
      }
    ]

    mockedPostJSONSSE.mockReturnValue(
      createJSONSSEStream([
        {
          type: 'done',
          data: {
            finishReason: 'stop'
          }
        }
      ])
    )

    await collectMessageEvents(generateSSEMessage('standard', [], { tools }))

    expect(mockedPostJSONSSE).toHaveBeenCalledWith(
      '/copilot/sse/message',
      {
        scope: 'standard',
        messages: [],
        tools
      },
      expect.objectContaining({
        timeout: expect.any(Number),
        signal: undefined
      })
    )
  })
})
