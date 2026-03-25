import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { z } from 'zod'
import {
  Copilot,
  sampleApiMessages,
  type ISessionExportedStorage,
  type IMessageEventGenerator,
  type Topic,
  RoundState,
  toApiMessage,
  type SessionExported
} from './copilot'
import type { Message } from '@/apis/copilot'
import * as apis from '@/apis/copilot'
import { timeout } from '@/utils/utils'

// Test constants
const THROTTLE_WAIT_TIME = 400
const COMPLETION_WAIT_TIME = 500

// Test helper functions
function createBasicTopic(title = 'Test Topic', description = 'Test description'): Topic {
  return {
    title: { en: title, zh: '测试主题' },
    description,
    reactToEvents: false
  }
}

function createEventTopic(title = 'Event Test Topic'): Topic {
  return {
    title: { en: title, zh: '事件测试主题' },
    description: 'Testing user events',
    reactToEvents: true
  }
}

function createTextDeltaEvent(text: string): apis.MessageEvent {
  return {
    type: 'text_delta',
    data: {
      text
    }
  }
}

function createToolCallDeltaEvent(
  data: Extract<apis.MessageEvent, { type: 'tool_call_delta' }>['data']
): apis.MessageEvent {
  return {
    type: 'tool_call_delta',
    data
  }
}

function createDoneEvent(finishReason: string): apis.MessageEvent {
  return {
    type: 'done',
    data: {
      finishReason
    }
  }
}

function createTextDeltaEvents(...texts: string[]): apis.MessageEvent[] {
  return texts.map((text) => createTextDeltaEvent(text))
}

function createTextStreamBatch(...texts: string[]): apis.MessageEvent[] {
  return [...createTextDeltaEvents(...texts), createDoneEvent('stop')]
}

function createTextStreamBatches(...responses: string[]): apis.MessageEvent[][] {
  return responses.map((response) => createTextStreamBatch(response))
}

function getMessageText(message: Message): string {
  const content = message.content
  if (content == null) {
    throw new Error('Expected message text content')
  }
  return content.text
}

function createCopilotWithStorage(
  eventBatches: apis.MessageEvent[][] = createTextStreamBatches('Hello! How can I help you?'),
  delay = 0,
  shouldNeverComplete = false
) {
  const storage = new MockStorage()
  const mockGenerator = new MockMessageEventGenerator(eventBatches, delay, shouldNeverComplete)
  const copilot = new Copilot(mockGenerator)
  copilot.syncSessionWith(storage)
  return { copilot, storage, mockGenerator }
}

async function waitForThrottledSave() {
  await timeout(THROTTLE_WAIT_TIME)
}

async function waitForCompletion() {
  await timeout(COMPLETION_WAIT_TIME)
}

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
    const limit = getMessageText(originalMessages[1]!).length + getMessageText(originalMessages[2]!).length + 10
    const messages = sampleApiMessages(originalMessages, limit)
    expect(messages.length).toBe(2)
    expect(messages[0]).toEqual(originalMessages[1])
    expect(messages[1]).toEqual(originalMessages[2])
  })

  it('should support copilot messages without text content', () => {
    const originalMessages: Message[] = [
      {
        role: 'copilot',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'list_projects',
              arguments: '{"query":"demo"}'
            }
          }
        ]
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'What happened?'
        }
      }
    ]

    expect(sampleApiMessages(originalMessages, 100)).toEqual(originalMessages)
  })
})

class MockStorage implements ISessionExportedStorage {
  private saved: SessionExported | null = null
  set(value: SessionExported | null): void {
    this.saved = value
  }
  get(): SessionExported | null {
    return this.saved
  }
}

class MockMessageEventGenerator implements IMessageEventGenerator {
  private eventBatches: apis.MessageEvent[][]
  private delay: number
  private shouldNeverComplete: boolean
  private callCount = 0

  constructor(
    eventBatches: apis.MessageEvent[][] = createTextStreamBatches('Hello! How can I help you?'),
    delay = 0,
    shouldNeverComplete = false
  ) {
    this.eventBatches = eventBatches
    this.delay = delay
    this.shouldNeverComplete = shouldNeverComplete
  }

  async *generateSSEMessage(
    messages: apis.Message[],
    options?: apis.GenerateSSEMessageOptions
  ): AsyncIterableIterator<apis.MessageEvent> {
    const batch = this.eventBatches[this.callCount] ?? []
    this.callCount += 1

    for (const event of batch) {
      if (options?.signal?.aborted) {
        throw new Error('Request was aborted')
      }

      if (this.delay > 0) {
        await timeout(this.delay)
      }

      yield event
    }

    if (!this.shouldNeverComplete) {
      return
    }

    while (!options?.signal?.aborted) {
      await timeout(100)
    }
  }
}

class MockSingleBatchMessageEventGenerator implements IMessageEventGenerator {
  constructor(
    private events: apis.MessageEvent[],
    private delay = 0
  ) {}

  async *generateSSEMessage(
    messages: apis.Message[],
    options?: apis.GenerateSSEMessageOptions
  ): AsyncIterableIterator<apis.MessageEvent> {
    for (const event of this.events) {
      if (options?.signal?.aborted) {
        throw new Error('Request was aborted')
      }

      if (this.delay > 0) {
        await timeout(this.delay)
      }

      yield event
    }
  }
}

class MockBatchedMessageEventGenerator implements IMessageEventGenerator {
  calls: apis.Message[][] = []
  callOptions: Array<apis.GenerateSSEMessageOptions | null> = []

  constructor(
    private eventBatches: apis.MessageEvent[][],
    private delay = 0
  ) {}

  async *generateSSEMessage(
    messages: apis.Message[],
    options?: apis.GenerateSSEMessageOptions
  ): AsyncIterableIterator<apis.MessageEvent> {
    this.calls.push(messages)
    this.callOptions.push(options ?? null)

    const batch = this.eventBatches[this.calls.length - 1] ?? []
    for (const event of batch) {
      if (options?.signal?.aborted) {
        throw new Error('Request was aborted')
      }

      if (this.delay > 0) {
        await timeout(this.delay)
      }

      yield event
    }
  }
}

describe('Copilot', () => {
  it('should convert copilot messages with text and tool calls to structured api messages', () => {
    expect(
      toApiMessage({
        role: 'copilot',
        content: 'Let me check that for you.',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'list_projects',
              arguments: '{"query":"demo"}'
            }
          }
        ]
      })
    ).toEqual({
      role: 'copilot',
      content: {
        type: 'text',
        text: 'Let me check that for you.'
      },
      toolCalls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }
      ]
    })
  })

  it('should convert copilot messages with tool calls only to structured api messages', () => {
    expect(
      toApiMessage({
        role: 'copilot',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'list_projects',
              arguments: '{"query":"demo"}'
            }
          }
        ]
      })
    ).toEqual({
      role: 'copilot',
      toolCalls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }
      ]
    })
  })

  it('should convert completed tool messages to structured api tool messages', () => {
    const message = toApiMessage({
      role: 'tool',
      callId: 'call_1',
      execution: {
        state: 'completed',
        result: {
          projects: ['demo']
        }
      }
    })

    expect(message).toEqual({
      role: 'tool',
      toolCallId: 'call_1',
      content: {
        type: 'text',
        text: '{"projects":["demo"]}'
      }
    })
    if (message.role !== 'tool') throw new Error('Expected a tool message')
    expect(message.content.text.includes('<tool-result')).toBe(false)
  })

  it('should sync session with storage correctly', async () => {
    const { copilot, storage, mockGenerator } = createCopilotWithStorage(
      createTextStreamBatches('Hello! How can I help you?')
    )

    // Sync with empty storage initially
    expect(copilot.currentSession).toBe(null)
    expect(storage.get()).toBe(null)

    // Start a new session
    const topic = createBasicTopic('Test Topic', 'This is a test topic for testing purposes')
    topic.reactToEvents = true
    topic.endable = true

    await copilot.startSession(topic)
    expect(copilot.currentSession).not.toBe(null)
    expect(copilot.currentSession?.topic).toEqual(topic)

    // Wait for session to be saved to storage
    await waitForThrottledSave()
    const savedData = storage.get()
    expect(savedData).not.toBe(null)
    expect(savedData!.topic).toEqual(topic)
    expect(savedData!.rounds).toEqual([])

    // Add a user message
    copilot.addUserTextMessage('What is the weather today?', topic)
    expect(copilot.currentSession?.rounds.length).toBe(1)
    const userMessage = copilot.currentSession?.rounds[0].userMessage
    expect(userMessage?.type).toBe('text')
    if (userMessage?.type === 'text') {
      expect(userMessage.content).toBe('What is the weather today?')
    }

    // Wait for the copilot response to complete and storage sync
    await waitForCompletion()

    // Check that the round completed successfully
    const currentRound = copilot.currentSession?.currentRound
    expect(currentRound?.state).toBe(RoundState.Completed)
    expect(currentRound?.resultMessages.length).toBe(1)
    expect(currentRound?.resultMessages[0].role).toBe('copilot')

    // Create a new copilot instance and sync with the same storage
    const newCopilot = new Copilot(mockGenerator)
    newCopilot.syncSessionWith(storage)

    // Verify session was restored correctly
    expect(newCopilot.currentSession).not.toBe(null)
    expect(newCopilot.currentSession?.topic).toEqual(topic)
    expect(newCopilot.currentSession?.rounds.length).toBe(1)
    const restoredUserMessage = newCopilot.currentSession?.rounds[0].userMessage
    expect(restoredUserMessage?.type).toBe('text')
    if (restoredUserMessage?.type === 'text') {
      expect(restoredUserMessage.content).toBe('What is the weather today?')
    }
    expect(newCopilot.currentSession?.rounds[0].resultMessages.length).toBe(1)
    expect(newCopilot.currentSession?.rounds[0].state).toBe(RoundState.Completed)
  })

  it('should handle user events correctly', async () => {
    const { copilot } = createCopilotWithStorage(createTextStreamBatches('Event received and processed.'))
    const topic = createEventTopic('Event Test Topic')

    await copilot.startSession(topic)

    // Notify a user event
    copilot.notifyUserEvent(
      { en: 'Project Started', zh: '项目启动' },
      'User started a new project with name "MyProject"'
    )

    expect(copilot.currentSession?.rounds.length).toBe(1)
    const eventMessage = copilot.currentSession?.rounds[0].userMessage
    expect(eventMessage?.type).toBe('event')
    if (eventMessage?.type === 'event') {
      expect(eventMessage.name).toEqual({ en: 'Project Started', zh: '项目启动' })
      expect(eventMessage.detail).toBe('User started a new project with name "MyProject"')
    }

    // Wait for response
    await waitForCompletion()
    expect(copilot.currentSession?.currentRound?.state).toBe(RoundState.Completed)
  })

  it('should handle session ending and storage clearing', async () => {
    const { copilot, storage } = createCopilotWithStorage(createTextStreamBatches('Goodbye!'))
    const topic = createBasicTopic('Ending Test', 'Testing session ending')

    await copilot.startSession(topic)
    copilot.addUserTextMessage('Hello', topic)

    // Wait for session to be saved
    await waitForThrottledSave()
    expect(storage.get()).not.toBe(null)

    // End the session
    copilot.endCurrentSession()
    expect(copilot.currentSession).toBe(null)

    // Wait for storage to be cleared
    await waitForThrottledSave()
    expect(storage.get()).toBe(null)
  })

  it('should handle multiple user messages in sequence', async () => {
    const { copilot } = createCopilotWithStorage(
      createTextStreamBatches('First response', 'Second response', 'Third response')
    )
    const topic = createBasicTopic('Multi Message Test', 'Testing multiple messages')

    await copilot.startSession(topic)

    // Add messages in quick succession
    copilot.addUserTextMessage('First question', topic)
    await timeout(100)

    copilot.addUserTextMessage('Second question', topic)
    await timeout(100)

    copilot.addUserTextMessage('Third question', topic)

    // Wait for completion
    await waitForCompletion()

    expect(copilot.currentSession?.rounds.length).toBe(3)
    const thirdUserMessage = copilot.currentSession?.rounds[2].userMessage
    expect(thirdUserMessage?.type).toBe('text')
    if (thirdUserMessage?.type === 'text') {
      expect(thirdUserMessage.content).toBe('Third question')
    }
    expect(copilot.currentSession?.currentRound?.state).toBe(RoundState.Completed)
  })

  it('should handle storage errors gracefully', async () => {
    class FailingStorage implements ISessionExportedStorage {
      set(): void {
        // Silently fail to avoid unhandled rejections
      }
      get(): SessionExported | null {
        throw new Error('Storage read failed')
      }
    }

    const failingStorage = new FailingStorage()
    const mockGenerator = new MockMessageEventGenerator(createTextStreamBatches('Hello!'))
    const copilot = new Copilot(mockGenerator)

    // Should not throw when syncing with failing storage
    expect(() => copilot.syncSessionWith(failingStorage)).not.toThrow()
    expect(copilot.currentSession).toBe(null)

    // Should still be able to start a session
    const topic = createBasicTopic('Error Test', 'Testing error handling')

    await copilot.startSession(topic)
    expect(copilot.currentSession).not.toBe(null)

    // Dispose of the copilot to prevent any pending watcher operations
    copilot.dispose()

    // Wait for any pending operations to complete
    await timeout(100)
  })

  it('should sync session with in-progress copilot message content', async () => {
    // Use a mock generator that streams a bit and then waits (never completes)
    const { copilot, storage } = createCopilotWithStorage(
      [createTextDeltaEvents('This is a streaming response...')],
      0,
      true
    )
    const topic = createBasicTopic('Streaming Test', 'Testing streaming message sync')

    await copilot.startSession(topic)

    // Add a user message to trigger streaming response
    copilot.addUserTextMessage('Tell me something', topic)

    // Wait a bit for streaming to start but not complete (the mock will never complete)
    await timeout(100)

    // At this point, there should be an in-progress message
    const currentRound = copilot.currentSession?.currentRound
    expect(currentRound?.state).toBe(RoundState.InProgress)
    expect(currentRound?.inProgressCopilotMessageContent).not.toBe(null)
    expect(currentRound?.inProgressCopilotMessageContent?.length).toBeGreaterThan(0)

    // Wait for throttled storage save
    await waitForThrottledSave()

    // Create a new copilot instance and sync with the same storage
    const newMockGenerator = new MockMessageEventGenerator(
      createTextStreamBatches('Continuing from where we left off...')
    )
    const newCopilot = new Copilot(newMockGenerator)
    newCopilot.syncSessionWith(storage)

    // Verify the in-progress message content was restored
    expect(newCopilot.currentSession).not.toBe(null)
    expect(newCopilot.currentSession?.rounds.length).toBe(1)
    const restoredRound = newCopilot.currentSession?.rounds[0]
    expect(restoredRound?.state).toBe(RoundState.Cancelled)
    expect(restoredRound?.inProgressCopilotMessageContent).toBe(currentRound?.inProgressCopilotMessageContent)

    // Clean up by aborting the original streaming
    copilot.currentSession?.abortCurrentRound()
    await timeout(100)
  })

  it('should finalize streamed assistant text-only responses', async () => {
    const generator = new MockSingleBatchMessageEventGenerator(
      [createTextDeltaEvent('Hello'), createTextDeltaEvent(', world!'), createDoneEvent('stop')],
      50
    )
    const copilot = new Copilot(generator)
    const topic = createBasicTopic('Text-only stream test', 'Testing streamed assistant text-only completion')

    await copilot.startSession(topic)
    copilot.addUserTextMessage('Say hello', topic)

    await timeout(60)

    const currentRound = copilot.currentSession?.currentRound
    expect(currentRound?.state).toBe(RoundState.InProgress)
    expect(currentRound?.inProgressCopilotMessageContent).toBe('Hello')
    expect(currentRound?.resultMessages).toEqual([])

    await waitForCompletion()

    expect(currentRound?.state).toBe(RoundState.Completed)
    expect(currentRound?.inProgressCopilotMessageContent).toBe(null)
    expect(currentRound?.error).toBe(null)
    expect(currentRound?.resultMessages).toEqual([
      {
        role: 'copilot',
        content: 'Hello, world!',
        toolCalls: []
      }
    ])
  })

  it('should finalize streamed assistant responses with text and tool calls in the same turn', async () => {
    const generator = new MockBatchedMessageEventGenerator([
      [
        createTextDeltaEvent('Let me check that for you.'),
        createToolCallDeltaEvent({
          index: 0,
          id: 'call_1',
          function: {
            name: 'list_projects',
            arguments: '{"query":'
          }
        }),
        createToolCallDeltaEvent({
          index: 0,
          function: {
            arguments: '"demo"}'
          }
        }),
        createDoneEvent('tool_calls')
      ],
      [createTextDeltaEvent('I found one matching project.'), createDoneEvent('stop')]
    ])
    const copilot = new Copilot(generator)
    copilot.registerTool({
      name: 'list_projects',
      description: 'List projects matching the query.',
      parameters: z.object({
        query: z.string()
      }),
      implementation: async ({ query }) => ({
        projects: [query]
      })
    })
    const topic = createBasicTopic(
      'Mixed assistant tool turn test',
      'Testing streamed assistant text + tool call finalization'
    )

    await copilot.startSession(topic)
    copilot.addUserTextMessage('Find my projects', topic)

    await waitForCompletion()

    const currentRound = copilot.currentSession?.currentRound
    expect(currentRound?.state).toBe(RoundState.Completed)
    expect(currentRound?.inProgressCopilotMessageContent).toBe(null)
    expect(currentRound?.resultMessages[0]).toEqual({
      role: 'copilot',
      content: 'Let me check that for you.',
      toolCalls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }
      ]
    })
    expect(currentRound?.resultMessages[1]).toEqual({
      role: 'tool',
      callId: 'call_1',
      execution: {
        state: 'completed',
        result: {
          projects: ['demo']
        }
      }
    })
    expect(currentRound?.resultMessages[2]).toEqual({
      role: 'copilot',
      content: 'I found one matching project.',
      toolCalls: []
    })

    expect(generator.calls).toHaveLength(2)
    expect(generator.calls[1]).toEqual([
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'Find my projects'
        }
      },
      {
        role: 'copilot',
        content: {
          type: 'text',
          text: 'Let me check that for you.'
        },
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'list_projects',
              arguments: '{"query":"demo"}'
            }
          }
        ]
      },
      {
        role: 'tool',
        toolCallId: 'call_1',
        content: {
          type: 'text',
          text: '{"projects":["demo"]}'
        }
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: copilot.getContextMessage().content
        }
      }
    ])
  })

  it('should finalize copilot messages with tool calls and no text', async () => {
    const generator = new MockBatchedMessageEventGenerator([
      [
        createToolCallDeltaEvent({
          index: 0,
          id: 'call_1',
          function: {
            name: 'list_projects',
            arguments: '{"query":'
          }
        }),
        createToolCallDeltaEvent({
          index: 0,
          function: {
            arguments: '"demo"}'
          }
        }),
        createDoneEvent('tool_calls')
      ],
      [createTextDeltaEvent('Here are your projects.'), createDoneEvent('stop')]
    ])
    const copilot = new Copilot(generator)
    copilot.registerTool({
      name: 'list_projects',
      description: 'List projects matching the query.',
      parameters: z.object({
        query: z.string()
      }),
      implementation: async ({ query }) => ({
        projects: [query]
      })
    })
    const topic = createBasicTopic('Tool-call only assistant test', 'Testing tool-call only finalization')

    await copilot.startSession(topic)
    copilot.addUserTextMessage('Find my projects', topic)

    await waitForCompletion()

    const currentRound = copilot.currentSession?.currentRound
    expect(currentRound?.state).toBe(RoundState.Completed)
    expect(currentRound?.inProgressCopilotMessageContent).toBe(null)
    expect(currentRound?.resultMessages[0]).toEqual({
      role: 'copilot',
      toolCalls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }
      ]
    })
    expect(currentRound?.resultMessages[1]).toEqual({
      role: 'tool',
      callId: 'call_1',
      execution: {
        state: 'completed',
        result: {
          projects: ['demo']
        }
      }
    })
    expect(currentRound?.resultMessages[2]).toEqual({
      role: 'copilot',
      content: 'Here are your projects.',
      toolCalls: []
    })
    const message = currentRound?.resultMessages[0]
    expect(message?.role).toBe('copilot')
    if (message?.role !== 'copilot') throw new Error('Expected a copilot message')
    expect(toApiMessage(message)).toEqual({
      role: 'copilot',
      toolCalls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }
      ]
    })

    const secondCallMessages = generator.calls[1]
    expect(secondCallMessages).toBeDefined()

    const toolMessage = secondCallMessages?.find(
      (candidate): candidate is Extract<apis.Message, { role: 'tool' }> => candidate.role === 'tool'
    )
    expect(toolMessage).toEqual({
      role: 'tool',
      toolCallId: 'call_1',
      content: {
        type: 'text',
        text: '{"projects":["demo"]}'
      }
    })
    const hasToolResultContext =
      secondCallMessages?.some((candidate) => {
        if (candidate.role !== 'user') return false
        return candidate.content.text.includes('<tool-result')
      }) ?? false
    expect(hasToolResultContext).toBe(false)
  })

  it('should continue the tool loop after tool execution', async () => {
    const generator = new MockBatchedMessageEventGenerator([
      [
        createToolCallDeltaEvent({
          index: 0,
          id: 'call_1',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }),
        createDoneEvent('tool_calls')
      ],
      [createTextDeltaEvent('Finished after the tool call.'), createDoneEvent('stop')]
    ])
    const copilot = new Copilot(generator)
    copilot.registerTool({
      name: 'list_projects',
      description: 'List projects matching the query.',
      parameters: z.object({
        query: z.string()
      }),
      implementation: async ({ query }) => ({
        projects: [query]
      })
    })
    const topic = createBasicTopic('Tool loop continuation test', 'Testing continued model rounds after tool execution')

    await copilot.startSession(topic)
    copilot.addUserTextMessage('Find my projects', topic)

    await waitForCompletion()

    const currentRound = copilot.currentSession?.currentRound
    expect(currentRound?.state).toBe(RoundState.Completed)
    expect(generator.calls).toHaveLength(2)
    expect(generator.calls[1]).toEqual([
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'Find my projects'
        }
      },
      {
        role: 'copilot',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'list_projects',
              arguments: '{"query":"demo"}'
            }
          }
        ]
      },
      {
        role: 'tool',
        toolCallId: 'call_1',
        content: {
          type: 'text',
          text: '{"projects":["demo"]}'
        }
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: copilot.getContextMessage().content
        }
      }
    ])
    expect(currentRound?.resultMessages).toEqual([
      {
        role: 'copilot',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'list_projects',
              arguments: '{"query":"demo"}'
            }
          }
        ]
      },
      {
        role: 'tool',
        callId: 'call_1',
        execution: {
          state: 'completed',
          result: {
            projects: ['demo']
          }
        }
      },
      {
        role: 'copilot',
        content: 'Finished after the tool call.',
        toolCalls: []
      }
    ])
  })

  it('should preserve the current copilot tool-call block when history sampling truncates older rounds', async () => {
    const previousUserMessage = 'u'.repeat(60_000)
    const previousCopilotMessage = 'a'.repeat(60_000)
    const generator = new MockBatchedMessageEventGenerator([
      [createTextDeltaEvent(previousCopilotMessage), createDoneEvent('stop')],
      [
        createToolCallDeltaEvent({
          index: 0,
          id: 'call_1',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }),
        createDoneEvent('tool_calls')
      ],
      [createTextDeltaEvent('Finished after the tool call.'), createDoneEvent('stop')]
    ])
    const copilot = new Copilot(generator)
    copilot.registerTool({
      name: 'list_projects',
      description: 'List projects matching the query.',
      parameters: z.object({
        query: z.string()
      }),
      implementation: async ({ query }) => ({
        projects: [query]
      })
    })
    const topic = createBasicTopic('History sampling tool pairing test', 'Testing tool-call history sampling')

    await copilot.startSession(topic)
    copilot.addUserTextMessage(previousUserMessage, topic)

    await waitForCompletion()

    copilot.addUserTextMessage('Find my projects', topic)

    await waitForCompletion()

    expect(generator.calls).toHaveLength(3)

    const sampledMessages = generator.calls[2]
    expect(sampledMessages).toBeDefined()
    const hasLatestUserMessage =
      sampledMessages?.some((message) => {
        if (message.role !== 'user') return false
        return message.content.text === 'Find my projects'
      }) ?? false
    expect(hasLatestUserMessage).toBe(true)

    const toolResultIndex = sampledMessages?.findIndex(
      (message) => message.role === 'tool' && message.toolCallId === 'call_1'
    )
    expect(toolResultIndex).toBeGreaterThan(0)
    expect(sampledMessages?.slice((toolResultIndex ?? 0) - 1, (toolResultIndex ?? 0) + 1)).toEqual([
      {
        role: 'copilot',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'list_projects',
              arguments: '{"query":"demo"}'
            }
          }
        ]
      },
      {
        role: 'tool',
        toolCallId: 'call_1',
        content: {
          type: 'text',
          text: '{"projects":["demo"]}'
        }
      }
    ])
    expect(sampledMessages?.at(-1)).toEqual({
      role: 'user',
      content: {
        type: 'text',
        text: copilot.getContextMessage().content
      }
    })
  })

  it('should keep custom element descriptions in context while sending tool definitions via api options', async () => {
    const generator = new MockBatchedMessageEventGenerator([[createTextDeltaEvent('Done.'), createDoneEvent('stop')]])
    const copilot = new Copilot(generator)
    copilot.registerContextProvider({
      provideContext: () => 'Project context'
    })
    copilot.registerCustomElement({
      tagName: 'project-link',
      description: 'Display a link to a project page.',
      attributes: z.object({
        project: z.string().describe('Project identifier to link to'),
        children: z.string().describe('Text shown for the link')
      }),
      isRaw: false,
      component: defineComponent(() => () => null)
    })
    copilot.registerTool({
      name: 'list_projects',
      description: 'List projects matching the query.',
      parameters: z.object({
        query: z.string()
      }),
      implementation: async ({ query }) => ({
        projects: [query]
      })
    })
    const topic = createBasicTopic('Prompt migration test', 'Testing prompt context without injected tools')

    await copilot.startSession(topic)
    copilot.addUserTextMessage('Find my projects', topic)

    await waitForCompletion()

    expect(generator.calls).toHaveLength(1)
    expect(generator.callOptions).toHaveLength(1)

    const contextMessage = generator.calls[0].at(-1)
    expect(contextMessage).toEqual({
      role: 'user',
      content: {
        type: 'text',
        text: copilot.getContextMessage().content
      }
    })
    expect(contextMessage).toBeDefined()
    if (contextMessage == null) throw new Error('Expected a context message')
    expect(contextMessage.role).toBe('user')
    if (contextMessage.role !== 'user') throw new Error('Expected a user context message')
    expect(contextMessage.content.text).toContain('Project context')
    expect(contextMessage.content.text).toContain('# Current topic between you and user')
    expect(contextMessage.content.text).toContain('# Available custom elements')
    expect(contextMessage.content.text).toContain('### `project-link`')
    expect(contextMessage.content.text).toContain('Display a link to a project page.')
    expect(contextMessage.content.text).toContain('Project identifier to link to')
    expect(contextMessage.content.text).not.toContain('# Available tools')
    expect(contextMessage.content.text).not.toContain('list_projects')

    const tools = generator.callOptions[0]?.tools
    expect(tools).toHaveLength(1)
    expect(tools?.[0]).toMatchObject({
      type: apis.ToolType.Function,
      function: {
        name: 'list_projects',
        description: 'List projects matching the query.'
      }
    })
    expect(tools?.[0].function.parameters).toMatchObject({
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string'
        }
      }
    })
  })

  it('should enter in-progress state for tool-call-only assistant turns', async () => {
    const generator = new MockBatchedMessageEventGenerator(
      [
        [
          createToolCallDeltaEvent({
            index: 0,
            id: 'call_1',
            function: {
              name: 'list_projects',
              arguments: '{"query":"demo"}'
            }
          }),
          createDoneEvent('tool_calls')
        ],
        [createTextDeltaEvent('Done.'), createDoneEvent('stop')]
      ],
      100
    )
    const copilot = new Copilot(generator)
    copilot.registerTool({
      name: 'list_projects',
      description: 'List projects matching the query.',
      parameters: z.object({
        query: z.string()
      }),
      implementation: async ({ query }) => ({
        projects: [query]
      })
    })
    const topic = createBasicTopic('Tool-call only progress test', 'Testing tool-call-only round progress state')

    await copilot.startSession(topic)
    copilot.addUserTextMessage('Find my projects', topic)

    await timeout(120)

    const currentRound = copilot.currentSession?.currentRound
    expect(currentRound?.state).toBe(RoundState.InProgress)
    expect(currentRound?.inProgressCopilotMessageContent).toBe(null)

    await waitForCompletion()

    expect(currentRound?.state).toBe(RoundState.Completed)
    expect(currentRound?.resultMessages[0]).toEqual({
      role: 'copilot',
      toolCalls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }
      ]
    })
    expect(currentRound?.resultMessages[1]).toEqual({
      role: 'tool',
      callId: 'call_1',
      execution: {
        state: 'completed',
        result: {
          projects: ['demo']
        }
      }
    })
    expect(currentRound?.resultMessages[2]).toEqual({
      role: 'copilot',
      content: 'Done.',
      toolCalls: []
    })
  })

  it('should ignore legacy tool-use markup in assistant text during tool execution', async () => {
    const generator = new MockSingleBatchMessageEventGenerator([
      createTextDeltaEvent('<tool-use id="call_legacy" tool="echo" parameters=' + '\'{"text":"demo"}\'' + ' />'),
      createDoneEvent('stop')
    ])
    const copilot = new Copilot(generator)
    copilot.registerTool({
      name: 'echo',
      description: 'Echo the provided text.',
      parameters: z.object({
        text: z.string()
      }),
      implementation: async ({ text }) => ({
        echoed: text
      })
    })
    const topic = createBasicTopic('Legacy tool-use ignore test', 'Testing legacy tool-use execution path removal')

    await copilot.startSession(topic)
    copilot.addUserTextMessage('Do not execute legacy markup', topic)

    await waitForCompletion()

    const currentRound = copilot.currentSession?.currentRound
    expect(currentRound?.state).toBe(RoundState.Completed)
    expect(currentRound?.resultMessages).toEqual([
      {
        role: 'copilot',
        content: '<tool-use id="call_legacy" tool="echo" parameters=' + '\'{"text":"demo"}\'' + ' />',
        toolCalls: []
      }
    ])
    expect(copilot.executor.getExecution('call_legacy')).toBe(null)
  })
})
