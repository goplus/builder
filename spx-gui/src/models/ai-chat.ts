interface ChatBot {
  startExplainChat(input: Input): Chat
  startCommentChat(input: Input): Chat
  startFixCodeChat(input: Input): Chat
}

interface Chat {
  sendUserMessage(userMessage: Input): Promise<Message>
}

type Message = {
  content: string
  actions: ReplyAction[]
}

type ReplyAction = {
  message: string
}

type Input = {
  input: string // user message
  lang: string // user native language
}

interface Suggest {
  startSuggestTask(input: CodeInput): SuggestItem[]
}

type CodeInput = {
  position: Position
  code: string
}

type Position = { line: number; column: number }

interface SuggestItem {
  label: string
  desc: string
  insertText: string
}
