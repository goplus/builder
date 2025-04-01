import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { generateStreamMessage, type Message } from '@/apis/copilot'
import type { ICopilot, Chat } from '@/components/copilot/index'
import {
  type MCPMarkdownString,
} from '@/components/editor/code-editor/common'

const maxChatMessageCount = 10
export type MessageRole = 'user' | 'copilot'

export type ChatMessage = {
  role: MessageRole
  content: MCPMarkdownString
}

export class Copilot extends Disposable implements ICopilot {
  constructor(
    private i18n: I18n,
  ) {
    super()
  }

  private chatMessage2Message({ role, content }: ChatMessage): Message {
    const contentText = typeof content.value === 'string' ? content.value : this.i18n.t(content.value)
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

  async *getChatCompletion(chat: Chat,
    options?: {
      signal?: AbortSignal
    }): AsyncIterableIterator<string> {
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

    // Use generateStreamMessage directly
    const stream = await generateStreamMessage(messages, {
        signal: options?.signal
    })

    // Forward each chunk from the stream
    for await (const chunk of stream) {
      yield chunk
    }
  }
}
