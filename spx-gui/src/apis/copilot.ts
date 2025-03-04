/**
 * @desc Copilot-related APIs of spx-backend
 */

import { client } from './common'

export type MessageContent = {
  type: 'text'
  text: string
}

export type Message = {
  role: 'user' | 'copilot'
  content: MessageContent
}

export async function generateMessage(messages: Message[], signal?: AbortSignal) {
  return (await client.post('/copilot/message', { messages }, { timeout: 15 * 1000, signal })) as Message
}

export async function* generateStreamMessage(
  messages: Message[],
  options?: {
    signal?: AbortSignal
  }
): AsyncIterableIterator<string> {
  try {
    const stream = (await client.postTextStream(
      '/copilot/stream/message',
      { messages },
      {
        timeout: 30 * 1000,
        signal: options?.signal
      }
    )) as AsyncIterableIterator<string>

    for await (const chunk of stream) {
      yield chunk
    }
  } catch (error) {
    console.error('Streaming error:', error)
    throw error
  }
}
