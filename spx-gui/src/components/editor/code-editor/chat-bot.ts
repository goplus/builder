import type { AIChatParams, AIStartChatParams, ProjectContext } from '@/apis/llm'
import { ChatAction, deleteChat, nextChat, startChat, UserLang } from '@/apis/llm'
import type { Project } from '@/models/project'
import { I18n } from '@/utils/i18n'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  content: string
  role: ChatRole
  actions?: ContinueAction[]
}

export type ContinueAction = {
  action: string
  click: () => Promise<boolean>
}

export class ChatBot {
  private i18n: I18n
  constructor(i18n: I18n) {
    this.i18n = i18n
  }

  startExplainChat(input: string, project: Project): Chat {
    return new Chat(
      this.createParams(ChatAction.explain, input, this.getUserLanguage(), project),
      this.i18nInputWithAction(input, ChatAction.explain)
    )
  }
  startCommentChat(input: string, project: Project): Chat {
    return new Chat(
      this.createParams(ChatAction.comment, input, this.getUserLanguage(), project),
      this.i18nInputWithAction(input, ChatAction.comment)
    )
  }
  startFixCodeChat(input: string, project: Project): Chat {
    return new Chat(
      this.createParams(ChatAction.fixCode, input, this.getUserLanguage(), project),
      this.i18nInputWithAction(input, ChatAction.fixCode)
    )
  }

  private createParams(
    action: ChatAction,
    input: string,
    userLanguage: UserLang,
    project: Project
  ): AIStartChatParams {
    const params: AIStartChatParams = {
      chatAction: action,
      projectContext: this.createProjectContext(project),
      userInput: input,
      userLang: userLanguage
    }
    return params
  }

  private createProjectContext(project: Project): ProjectContext {
    const [metadata] = project.export()
    const projectContext: ProjectContext = {
      projectName: metadata.name,
      projectVariable: [],
      projectCode: []
    }
    for (const sound of project.sounds) {
      projectContext.projectVariable.push({
        type: 'Sounds',
        name: sound.name
      })
    }
    for (const sprite of project.sprites) {
      projectContext.projectVariable.push({
        type: 'Sprites',
        name: sprite.name
      })
      projectContext.projectCode.push({
        type: 'Sprite',
        name: sprite.name,
        src: sprite.code
      })
    }
    projectContext.projectCode.push({
      type: 'Stage',
      name: 'Stage',
      src: project.stage.code
    })
    return projectContext
  }

  private i18nInputWithAction(input: string, action: ChatAction): string {
    switch (action) {
      case ChatAction.explain:
        return this.i18n.t({ en: 'Explain the code: \n', zh: '解释一下这段代码: \n' }) + input
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
  loading: boolean = true

  constructor(params: AIStartChatParams, showMessage: string) {
    this.loading = true
    this.messages.push({
      content: showMessage,
      role: 'user',
      actions: []
    })
    this.sendFirstMessage(params)
  }

  async sendFirstMessage(params: AIStartChatParams) {
    this.length++
    const res = await startChat(params)
    this.loading = false
    const content = res.respMessage
    const questions = res.respQuestions
    const messages: ChatMessage = {
      content: content,
      role: 'assistant',
      actions: questions.map((question) => ({
        action: question,
        click: () => this.nextMessage(question)
      }))
    }
    this.chatID = res.id
    this.messages.push(messages)
  }

  async nextMessage(msg: string): Promise<boolean> {
    if (this.length > 20) {
      return false
    }
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
    this.length++
    this.loading = false
    const content = res.respMessage
    const questions = res.respQuestions
    const assistantMessage: ChatMessage = {
      content: content,
      role: 'assistant',
      actions: questions.map((question) => ({
        action: question,
        click: () => this.nextMessage(question)
      }))
    }
    this.messages.push(assistantMessage)
    return true
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
