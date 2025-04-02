/**
 * @desc Copilot-related APIs of spx-backend
 */

import { client } from './common'

export enum ToolType {
  Function = "function"
}

export type FunctionDefinition = {
  name: string
  description?: string
  parameters: ToolParameters
}

export type SchemaProperty = {
  type: string
  description?: string
  enum?: Array<string | number | boolean>
  enumDescriptions?: string[]
  format?: string
  default?: any
  // 其他可能的JSON Schema属性
  [key: string]: any
}

export type ToolParameters = {
  type: 'object'
  properties: {
    [key: string]: SchemaProperty
  }
  required?: string[]
  // 其他可能的JSON Schema属性
  [key: string]: any
}

export type MessageContent = {
  type: 'text'
  text: string
}

export type Message = {
  role: 'user' | 'copilot'
  content: MessageContent
}

export type Tool = {
  type: ToolType
  function: FunctionDefinition
}

export async function generateMessage(messages: Message[], signal?: AbortSignal) {
  return (await client.post('/copilot/message', { messages }, { timeout: 15 * 1000, signal })) as Message
}

export async function* generateStreamMessage(
  messages: Message[],
  options?: {
    signal?: AbortSignal
    tools?: Tool[]
  }
): AsyncIterableIterator<string> {
  try {
    const stream = await client.postTextStream(
      '/copilot/stream/message',
      { messages, tools: options?.tools },
      {
        timeout: 15 * 1000,
        signal: options?.signal
      }
    )

    for await (const chunk of stream) {
      yield chunk
    }
  } catch (error) {
    console.error('Streaming error:', error)
    throw error
  }
}
