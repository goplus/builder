import { reactive } from "vue";
import type { AIChatParams, AIStartChatParams, AITaskParams, ProjectContext } from '@/apis/llm'
import { ChatAction, deleteChat, nextChat, startChat, startTask, TaskAction, UserLang } from '@/apis/llm'
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
  getProject: () => Project
  constructor(i18n: I18n, getProject: () => Project) {
    this.i18n = i18n
    this.getProject = getProject
  }

  startExplainChat(input: string): Chat {
    return reactive(
      new Chat(
        this.createParams(ChatAction.explain, input, this.getUserLanguage(), this.getProject()),
        this.i18nInputWithAction(input, ChatAction.explain)
      )
    )
  }
  startCommentChat(input: string): Chat {
    return reactive(
      new Chat(
        this.createParams(ChatAction.comment, input, this.getUserLanguage(),  this.getProject()),
        this.i18nInputWithAction(input, ChatAction.comment)
      )
    )
  }
  startFixCodeChat(input: string): Chat {
    return reactive(
      new Chat(
        this.createParams(ChatAction.fixCode, input, this.getUserLanguage(),  this.getProject()),
        this.i18nInputWithAction(input, ChatAction.fixCode)
      )
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
      projectContext: createProjectContext(project),
      userInput: input,
      userLang: userLanguage
    }
    return params
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
  chatState = reactive<{chatID: string, messages: ChatMessage[], length: number, loading: boolean}>({
    chatID:  '',
    messages:  [],
    length: 0,
    loading: true,
  })

  constructor(params: AIStartChatParams, showMessage: string) {
    this.chatState.loading = true
    this.chatState.messages.push({
      content: showMessage,
      role: 'user',
      actions: []
    })
    this.sendFirstMessage(params)
  }

  async sendFirstMessage(params: AIStartChatParams) {
    this.chatState.length++
    const res = await startChat(params)
    this.chatState.loading = false
    const content = res.resp_message
    const questions = res.resp_questions
    const messages: ChatMessage = {
      content: content,
      role: 'assistant',
      actions: questions.map((question) => ({
        action: question,
        click: () => this.nextMessage(question)
      }))
    }
    this.chatState.chatID = res.id
    this.chatState.messages.push(messages)
  }

  async nextMessage(msg: string): Promise<boolean> {
    if (this.chatState.length > 20) {
      return false
    }
    this.chatState.loading = true
    const userMessage: ChatMessage = {
      content: msg,
      role: 'user',
      actions: []
    }
    this.chatState.messages.push(userMessage)
    const params: AIChatParams = {
      userInput: msg
    }
    const res = await nextChat(this.chatState.chatID, params)
    this.chatState.length++
    this.chatState.loading = false
    const content = res.resp_message
    const questions = res.resp_questions
    const assistantMessage: ChatMessage = {
      content: content,
      role: 'assistant',
      actions: questions.map((question) => ({
        action: question,
        click: () => this.nextMessage(question)
      }))
    }
    this.chatState.messages.push(assistantMessage)
    return true
  }

  async deleteChat() {
    await deleteChat(this.chatState.chatID)
  }
}

function createProjectContext(project: Project): ProjectContext {
  const [metadata] = project.export()
  const projectContext: ProjectContext = {
    projectName: metadata.name,
    projectVariables: [],
    projectCode: []
  }
  for (const sound of project.sounds) {
    projectContext.projectVariables.push({
      type: 'Sound',
      name: sound.name
    })
  }
  for (const sprite of project.sprites) {
    projectContext.projectVariables.push({
      type: 'Sprite',
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

export class Suggest {
  getProject: () => Project

  constructor(getProject: () => Project) {
    this.getProject = getProject
  }

  async startSuggestTask(input: CodeInput): Promise<SuggestItem[]> {
    const params: AITaskParams = {
      taskAction: TaskAction.suggest,
      projectContext: createProjectContext(this.getProject()),
      userCode: input.code,
      userCursor: input.position
    }
    const res = await startTask(params)
    const suggests = res.codeSuggests
    return suggests.map((suggest) => ({
      label: suggest.label,
      desc: suggest.label,
      insertText: suggest.insertText
    }))
  }
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
