import type { Chat, ChatContext, ChatMessage, ICopilot } from './ui'

export class Copilot implements ICopilot {
  async getChatCompletion(ctx: ChatContext, chat: Chat): Promise<ChatMessage | null> {
    console.warn('TODO', ctx, chat)
    return null
  }
}
