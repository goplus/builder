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

export type ToolCallFunction = {
  name: string
  arguments: string
}

export type ToolCallInfo = {
  id: string
  type: 'function'
  function: ToolCallFunction
}

export type Message =
  | {
      role: 'user'
      content: MessageContent
    }
  | {
      role: 'tool'
      toolCallId: string
      content: MessageContent
    }
  | {
      role: 'copilot'
      content?: MessageContent
      toolCalls?: ToolCallInfo[]
    }

export type MessageEvent =
  | {
      type: 'text_delta'
      data: {
        text: string
      }
    }
  | {
      type: 'tool_call_delta'
      data: {
        index: number
        id?: string
        function: {
          name?: string
          arguments?: string
        }
      }
    }
  | {
      type: 'done'
      data: {
        finishReason: string
      }
    }
  | {
      type: 'error'
      data: {
        reason: 'streamFailed'
        message: string
      }
    }

export type Tool = {
  type: ToolType
  function: FunctionDefinition
}

export type GenerateMessageOptions = {
  signal?: AbortSignal
}

export type GenerateSSEMessageOptions = GenerateMessageOptions & {
  tools?: Tool[]
}

const timeout = 15 * 1000

export function generateMessage(scope: CopilotScope, messages: Message[], options?: GenerateMessageOptions) {
  return client.post(
    '/copilot/message',
    { scope, messages },
    { timeout: timeout, signal: options?.signal }
  ) as Promise<Message>
}

export async function* generateSSEMessage(
  scope: CopilotScope,
  messages: Message[],
  options?: GenerateSSEMessageOptions
): AsyncIterableIterator<MessageEvent> {
  try {
    const stream = client.postJSONSSE(
      '/copilot/sse/message',
      { scope, messages, tools: options?.tools },
      {
        timeout: timeout,
        signal: options?.signal
      }
    )

    for await (const event of stream) {
      const me = event as MessageEvent
      yield me
      if (me.type === 'done' || me.type === 'error') return
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
    const stream = client.postTextStream(
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
