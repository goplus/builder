export type MessageContent = {
  type: 'text'
  text: string
}

export type Message = {
  role: 'user' | 'copilot'
  content: MessageContent
}

export interface CopilotApis {
  generateStreamMessage(messages: Message[]): AsyncIterableIterator<string>
}
