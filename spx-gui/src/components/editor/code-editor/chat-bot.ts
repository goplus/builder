import type { AIChatParams, AIStartChatParams } from '@/apis/llm'
import { ChatAction, deleteChat, nextChat, startChat, UserLang } from '@/apis/llm'
import { I18n } from '@/utils/i18n'

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
    return new Chat(input, this.i18nInputWithAction(input,ChatAction.explain), this.getUserLanguage(), ChatAction.explain)
  }
  startCommentChat(input: string): Chat {
    return new Chat(input, this.i18nInputWithAction(input,ChatAction.comment), this.getUserLanguage(), ChatAction.comment)
  }
  startFixCodeChat(input: string): Chat {
    return new Chat(input, this.i18nInputWithAction(input,ChatAction.fixCode), this.getUserLanguage(), ChatAction.fixCode)
  }

  private i18nInputWithAction(input: string, action: ChatAction): string {
    switch (action) {
      case ChatAction.explain:
        return (
          this.i18n.t({ en: 'Explain the code: \n', zh: '解释一下这段代码: \n' }) + input
        )
      case ChatAction.comment:
        return (
          this.i18n.t({ en: 'I want to comment the code: ', zh: '我想给这段代码写注释: ' }) + input
        )
      case ChatAction.fixCode:
        this.i18n.t({ en: 'I want to fix the code: ', zh: '帮我修复这段代码的问题: ' }) + input
    }
    return ''
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

  constructor(firstMessage: string,showMessage :string, userLanguage: UserLang, action: ChatAction) {
    this.messages.push({
      content: showMessage ,
      role: 'user',
      actions: []
    })
    this.action = action
    this.userLanguage = userLanguage
    this.sendFirstMessage(firstMessage)
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
