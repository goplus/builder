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

export type StreamCallback = (chunk: Message) => void

export async function generateStreamMessage(
  messages: Message[],
  options?: {
    signal?: AbortSignal
    onChunk?: StreamCallback
  }
): Promise<Message> {
  const { signal, onChunk } = options ?? {}
  let accumulatedText = ''

  try {
    const response = await client.postStream(
      '/copilot/stream/message',
      { messages },
      {
        responseType: 'stream',
        timeout: 30 * 1000,
        signal,
      }
    )

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    let streamActive = true
    while (streamActive) {
      const { done, value } = await reader.read()
      if (done) {
        streamActive = false
        continue
      }

      // Decode and process each chunk
      const text = decoder.decode(value, { stream: true })

      // trim the text to remove any leading or trailing whitespace
      if (text.trim()) {
        accumulatedText += text
        onChunk?.({
          role: 'copilot',
          content: {
            type: 'text',
            text: accumulatedText
          }
        })
      }
    }

    // Return the complete message
    return {
      role: 'copilot',
      content: {
        type: 'text',
        text: accumulatedText
      }
    }

  } catch (error) {
    console.error('Streaming error:', error)
    throw error
  }
}


