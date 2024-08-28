import type { AIChatParams, AIStartChatParams } from '@/apis/llm'
import { ChatAction, deleteChat, nextChat, startChat, UserLang } from '@/apis/llm'
import type { I18n } from '@/utils/i18n'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  content: string
  role: ChatRole
  actions?: ContinueAction[]
}

export type ContinueAction = {
  action: string
  click: (action: string) => Promise<void>
}

export class ChatBot {
  private i18n: I18n
  constructor(i18n: I18n) {
    this.i18n = i18n
  }

  startExplainChat(input: string): Chat {
    return new Chat(input, this.getUserLanguage(), ChatAction.explain)
  }
  startCommentChat(input: string): Chat {
    return new Chat(input, this.getUserLanguage(), ChatAction.comment)
  }
  startFixCodeChat(input: string): Chat {
    return new Chat(input, this.getUserLanguage(), ChatAction.fixCode)
  }

  private getUserLanguage(): UserLang {
    switch (this.i18n.lang.value) {
      case 'zh':
        return UserLang.chinese
      case 'en':
        return UserLang.english
    }
  }
}

export class Chat {
  chatID: string = ''
  messages: ChatMessage[] = []
  length: number = 0
  action: ChatAction
  userLanguage: UserLang
  loading: boolean = true

  constructor(firstMessage: string, userLanguage: UserLang, action: ChatAction) {
    this.messages.push({
      content: firstMessage,
      role: 'user',
      actions: []
    })
    this.action = action
    this.userLanguage = userLanguage
  }

  async sendFirstMessage(input: string) {
    const params: AIStartChatParams = {
      chatAction: this.action,
      projectContext: {
        projectName: '',
        projectVariable: {
          type: '',
          name: ''
        },
        projectCode: []
      },
      userInput: input,
      userLang: this.userLanguage
    }
    const res = await startChat(params)
    this.loading = false
    const content = res.respMessage
    const questions = res.respQuestions
    const messages: ChatMessage = {
      content: content,
      role: 'assistant',
      actions: questions.map((question) => ({
        action: question,
        click: this.nextMessage
      }))
    }
    this.chatID = res.id
    this.messages.push(messages)
  }

  async nextMessage(msg: string) {
    this.loading = true
    const userMessage: ChatMessage = {
      content: msg,
      role: 'user',
      actions: []
    }
    this.messages.push(userMessage)
    const params: AIChatParams = {
      userInput: msg
    }
    const res = await nextChat(this.chatID, params)
    this.loading = false
    const content = res.respMessage
    const questions = res.respQuestions
    const assistantMessage: ChatMessage = {
      content: content,
      role: 'assistant',
      actions: questions.map((question) => ({
        action: question,
        click: this.nextMessage
      }))
    }
    this.messages.push(assistantMessage)
  }

  async deleteChat() {
    await deleteChat(this.chatID)
  }
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
