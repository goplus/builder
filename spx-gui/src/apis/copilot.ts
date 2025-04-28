/**
 * @desc Copilot-related APIs of spx-backend
 */

import { client } from './common'

export enum ToolType {
  Function = 'function'
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

  [key: string]: any
}

export type ToolParameters = {
  type: 'object'
  properties: {
    [key: string]: SchemaProperty
  }
  required?: string[]

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

const timeout = 15 * 1000

export async function generateMessage(messages: Message[], signal?: AbortSignal) {
  return (await client.post('/copilot/message', { messages }, { timeout: timeout, signal })) as Message
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
        timeout: timeout,
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

export async function* workflowStreamMessage(
  messages: Message[],
  options?: {
    signal?: AbortSignal
    tools?: Tool[]
    workflow?: {
      env?: Record<string, any>
    }
  }
): AsyncIterableIterator<string> {
  try {
    const stream = await client.postTextStream(
      '/workflow/stream/message',
      {
        messages,
        tools: options?.tools,
        workflow: options?.workflow
          ? {
              env: options.workflow.env || {}
            }
          : undefined
      },
      {
        timeout: timeout,
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
