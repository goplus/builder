import { reactive } from 'vue'
import type { AIStartChatParams } from '@/apis/llm'
import { UserLang } from '@/apis/llm'
import type { I18n } from '@/utils/i18n'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  content: string
  role: ChatRole
  actions?: ChatAction[]
}

export type ChatAction = {
  action: string
  click: (action: string) => void
}

export class ChatBot {
  private i18n: I18n
  constructor(i18n: I18n) {
    this.i18n = i18n
  }

  startExplainChat(input: Input): Chat {
    return new Chat()
  }
  startCommentChat(input: Input): Chat {
    return new Chat()
  }
  startFixCodeChat(input: Input): Chat {
    return new Chat()
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

  constructor() {}

  // async sendFirstMessage(input: Input): Promise<ChatMessage> {}

  async sendUserMessage(userMessage: Input): Promise<ChatMessage> {
    return {
      content: '',
      role: 'assistant',
      actions: []
    }
  }
}

export class ChatBotModal {
  constructor() {}

  setVisible(visible: boolean) {
    this.state.visible = visible
  }

  state = reactive({ visible: false, chat: Chat })
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
