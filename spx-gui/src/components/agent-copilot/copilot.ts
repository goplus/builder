import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { workflowStreamMessage, type Message, type Tool, ToolType } from '@/apis/copilot'
import type { ICopilot, Chat } from '.'
import type { ToolDescription, ToolRegistry } from './mcp/registry'

function convertToApiTools(serverTools: ToolDescription[]): Tool[] {
  return serverTools.map((tool) => {
    const properties: { [key: string]: any } = {}
    if (tool.inputSchema.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([key, value]) => {
        properties[key] = value as any
      })
    }

    const required = Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : []

    return {
      type: ToolType.Function,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties,
          required: required
        }
      }
    }
  })
}

const maxChatMessageCount = 10
export type MessageRole = 'user' | 'copilot'

export type ChatMessage = {
  role: MessageRole
  content: string
}

export class Copilot extends Disposable implements ICopilot {
  constructor(
    private i18n: I18n,
    private registry: ToolRegistry
  ) {
    super()
  }

  private chatMessage2Message({ role, content }: ChatMessage): Message {
    const contentText = typeof content === 'string' ? content : this.i18n.t(content)
    return {
      role,
      content: {
        type: 'text',
        text: contentText
      }
    }
  }

  private makeSkippingMessage(toSkip: number): Message {
    return {
      role: 'user',
      content: {
        type: 'text',
        text: this.i18n.t({
          en: `(${toSkip} messages skipped)`,
          zh: `（跳过了 ${toSkip} 条消息）`
        })
      }
    }
  }

  async *getChatCompletion(
    chat: Chat,
    options?: {
      signal?: AbortSignal
    }
  ): AsyncIterableIterator<string> {
    const messages: Message[] = []
    const toSkip = chat.messages.length - maxChatMessageCount

    // skip chat messages in range `[1, toSkip]`
    chat.messages.forEach((message, i) => {
      if (i === 0) {
        messages.push(this.chatMessage2Message(message))
        if (toSkip > 0) messages.push(this.makeSkippingMessage(toSkip))
        return
      }
      if (i > toSkip) messages.push(this.chatMessage2Message(message))
    })

    const tools = convertToApiTools(this.registry.tools.value)
    // Use generateStreamMessage directly
    const stream = await workflowStreamMessage(messages, {
      signal: options?.signal,
      tools: tools,
      workflow: {
        env: chat.env
      }
    })

    // Forward each chunk from the stream
    for await (const chunk of stream) {
      yield chunk
    }
  }
}
