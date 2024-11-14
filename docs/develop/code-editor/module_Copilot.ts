declare interface CopilotImpl {
  getChatCompletion(ctx: ChatContext, chat: Chat): Promise<ChatMessage | null>
}