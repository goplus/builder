import type { MessageEvent, ToolCallInfo } from '@/apis/copilot'

export type ToolCallDraft = {
  id: string | null
  type: 'function'
  function: {
    name: string | null
    arguments: string
  }
}

export function accumulateToolCallDelta(
  toolCalls: Array<ToolCallDraft | null>,
  event: Extract<MessageEvent, { type: 'tool_call_delta' }>
) {
  let toolCall = toolCalls[event.data.index]
  if (toolCall == null) {
    toolCall = {
      id: null,
      type: 'function',
      function: {
        name: null,
        arguments: ''
      }
    }
    toolCalls[event.data.index] = toolCall
  }

  if (event.data.id != null) toolCall.id = event.data.id
  if (event.data.function.name != null) toolCall.function.name = event.data.function.name
  if (event.data.function.arguments != null) toolCall.function.arguments += event.data.function.arguments
}

export function finalizeToolCalls(toolCalls: Array<ToolCallDraft | null>): ToolCallInfo[] {
  const finalizedToolCalls: ToolCallInfo[] = []
  for (const [index, toolCall] of toolCalls.entries()) {
    if (toolCall == null) continue
    if (toolCall.id == null) throw new Error(`Incomplete tool call at index ${index}: missing id`)
    if (toolCall.function.name == null) {
      throw new Error(`Incomplete tool call at index ${index}: missing function name`)
    }
    finalizedToolCalls.push({
      id: toolCall.id,
      type: 'function',
      function: {
        name: toolCall.function.name,
        arguments: toolCall.function.arguments
      }
    })
  }
  return finalizedToolCalls
}
