/**
 * @desc Copilot-related APIs of spx-backend
 */

import type { JsonSchema7Type } from 'zod-to-json-schema'
import { client } from './common'

export type CopilotScope = 'standard' | 'code'

export enum ToolType {
  Function = 'function'
}

export type FunctionDefinition = {
  name: string
  description?: string
  parameters: JsonSchema7Type
}

export type MessageContent = {
  type: 'text'
  text: string
}

export type Message = {
  role: 'user' | 'copilot' | 'tool'
  content: MessageContent
}

export type Tool = {
  type: ToolType
  function: FunctionDefinition
}

export type GenerateMessageOptions = {
  signal?: AbortSignal
}

const timeout = 15 * 1000

export async function generateMessage(scope: CopilotScope, messages: Message[], options?: GenerateMessageOptions) {
  return (await client.post(
    '/copilot/message',
    { scope, messages },
    { timeout: timeout, signal: options?.signal }
  )) as Message
}

export async function* generateStreamMessage(
  scope: CopilotScope,
  messages: Message[],
  options?: GenerateMessageOptions
): AsyncIterableIterator<string> {
  try {
    const stream = await client.postTextStream(
      '/copilot/stream/message',
      { scope, messages },
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
