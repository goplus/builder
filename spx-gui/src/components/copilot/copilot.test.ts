import { describe, expect, it } from 'vitest'
import {
  Copilot,
  sampleApiMessages,
  type IStorage,
  type IMessageStreamGenerator,
  type Topic,
  RoundState,
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

function createCopilotWithStorage(
  responses: string[] = ['Hello! How can I help you?'],
  delay = 0,
  shouldNeverComplete = false
) {
  const storage = new MockStorage()
  const mockGenerator = new MockMessageStreamGenerator(responses, delay, shouldNeverComplete)
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
    const limit = originalMessages[1].content.text.length + originalMessages[2].content.text.length + 10
    const messages = sampleApiMessages(originalMessages, limit)
    expect(messages.length).toBe(2)
    expect(messages[0]).toEqual(originalMessages[1])
    expect(messages[1]).toEqual(originalMessages[2])
  })
})

class MockStorage implements IStorage<SessionExported | null> {
  private saved: SessionExported | null = null
  set(value: SessionExported | null): void {
    this.saved = value
  }
  get(): SessionExported | null {
    return this.saved
  }
}

class MockMessageStreamGenerator implements IMessageStreamGenerator {
  private responses: string[]
  private delay: number
  private shouldNeverComplete: boolean

  constructor(responses: string[] = ['Hello! How can I help you?'], delay = 0, shouldNeverComplete = false) {
    this.responses = responses
    this.delay = delay
    this.shouldNeverComplete = shouldNeverComplete
  }

  async *generateStreamMessage(
    scope: apis.CopilotScope,
    messages: apis.Message[],
    options?: apis.GenerateMessageOptions
  ): AsyncIterableIterator<string> {
    for (const response of this.responses) {
      if (options?.signal?.aborted) {
        throw new Error('Request was aborted')
      }

      if (this.delay > 0) {
        await timeout(this.delay)
      }

      if (this.shouldNeverComplete) {
        // Yield just first part and then wait indefinitely unless aborted
        yield response.substring(0, Math.min(10, response.length))
        while (!options?.signal?.aborted) {
          await timeout(100)
        }
        return
      }

      // Yield entire response at once for simplicity in tests
      yield response
    }
  }
}

describe('Copilot', () => {
  it('should sync session with storage correctly', async () => {
    const { copilot, storage, mockGenerator } = createCopilotWithStorage(['Hello! How can I help you?'])

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
    const { copilot } = createCopilotWithStorage(['Event received and processed.'])
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
    const { copilot, storage } = createCopilotWithStorage(['Goodbye!'])
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
    const responses = ['First response', 'Second response', 'Third response']
    const { copilot } = createCopilotWithStorage(responses)
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
    class FailingStorage implements IStorage<SessionExported | null> {
      set(): void {
        // Silently fail to avoid unhandled rejections
      }
      get(): SessionExported | null {
        throw new Error('Storage read failed')
      }
    }

    const failingStorage = new FailingStorage()
    const mockGenerator = new MockMessageStreamGenerator(['Hello!'])
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
    const { copilot, storage } = createCopilotWithStorage(['This is a streaming response...'], 0, true)
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
    const newMockGenerator = new MockMessageStreamGenerator(['Continuing from where we left off...'])
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
})
