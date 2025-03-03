import { ref } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ActionException, Cancelled } from '@/utils/exception'
import {
  type BaseContext,
  type DefinitionIdentifier,
  type CodeSegment,
  type TextDocumentRange,
  type BasicMarkdownString,
  type Diagnostic,
  makeBasicMarkdownString,
  type TextDocumentIdentifier,
  type Position,
  type Selection,
  type ITextDocument
} from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'
import { makeCodeBlock, makeCodeLinkWithRange } from '../markdown'

export enum ChatTopicKind {
  Inspire,
  Explain,
  Review,
  FixProblem
}

export type ChatTopicInspire = {
  kind: ChatTopicKind.Inspire
  problem: string
}

export enum ChatExplainKind {
  CodeSegment,
  SymbolWithDefinition,
  Definition
}

export type ChatExplainTargetCodeSegment = {
  kind: ChatExplainKind.CodeSegment
  codeSegment: CodeSegment
}

export type SymbolWithDefinition = TextDocumentRange & {
  symbol: string
  definition: DefinitionIdentifier
}

export type ChatExplainTargetSymbolWithDefinition = SymbolWithDefinition & {
  kind: ChatExplainKind.SymbolWithDefinition
}

export type ChatExplainTargetDefinition = {
  kind: ChatExplainKind.Definition
  overview: string
  definition: DefinitionIdentifier
}

export type ChatTopicExplainTarget =
  | ChatExplainTargetCodeSegment
  | ChatExplainTargetSymbolWithDefinition
  | ChatExplainTargetDefinition

export type ChatTopicExplain = {
  kind: ChatTopicKind.Explain
  target: ChatTopicExplainTarget
}

export type ChatTopicReview = TextDocumentRange & {
  kind: ChatTopicKind.Review
  code: string
}

export type ChatTopicFixProblem = {
  kind: ChatTopicKind.FixProblem
  textDocument: TextDocumentIdentifier
  problem: Diagnostic
}

export type ChatTopic = ChatTopicInspire | ChatTopicExplain | ChatTopicReview | ChatTopicFixProblem

export type MessageRole = 'user' | 'copilot'

export type ChatMessage = {
  role: MessageRole
  content: BasicMarkdownString
}

export type Chat = {
  topic: ChatTopic
  messages: ChatMessage[]
}

export type ChatContext = BaseContext & {
  /** All opened text documents, including main and temp text documents */
  openedTextDocuments: ITextDocument[]
  cursorPosition: Position | null
  selection: Selection | null
}

export interface ICopilot extends Disposable {
  getChatCompletion(
    ctx: ChatContext, 
    chat: Chat
  ): AsyncIterableIterator<string>
}

export enum RoundState {
  Loading,
  Completed,
  Cancelled,
  Failed
}

export type Round = {
  problem: BasicMarkdownString
  /**
   * Answer provided by the copilot.
   * `null` means the answer is still loading or the round is cancelled by the user.
   */
  answer: BasicMarkdownString | null
  error: ActionException | null
  state: RoundState
  ctrl: AbortController
}

type InternalChat = {
  topic: ChatTopic
  rounds: Round[]
  ctrl: AbortController
}

export class CopilotController extends Disposable {
  constructor(private ui: CodeEditorUI) {
    super()
  }

  private copilot: ICopilot | null = null

  registerCopilot(copilot: ICopilot) {
    this.copilot = copilot
  }

  private currentChatRef = ref<InternalChat | null>(null)
  get currentChat(): InternalChat | null {
    return this.currentChatRef.value ?? null
  }

  async startChat(topic: ChatTopic) {
    this.ui.setIsCopilotActive(true)
    const currentChat = this.currentChat
    if (currentChat != null) currentChat.ctrl.abort()

    this.currentChatRef.value = {
      topic,
      rounds: [],
      ctrl: new AbortController()
    }
    await this.startRound(getTopicMessageContent(topic))
  }

  endChat() {
    if (this.currentChatRef.value != null) {
      this.currentChatRef.value.ctrl.abort()
      this.currentChatRef.value = null
    }
    this.ui.setIsCopilotActive(false)
  }

  async askProblem(problem: string) {
    await this.startRound(makeBasicMarkdownString(problem))
  }

  cancelCurrentRound() {
    const currentRound = this.ensureCurrentRound()
    if (currentRound.state !== RoundState.Loading)
      throw new Error(`Current round can not be cancelled, state: ${currentRound.state}`)
    currentRound.ctrl.abort(new Cancelled())
  }

  async retryCurrentRound() {
    const rounds = this.currentChat?.rounds
    if (rounds == null || rounds.length === 0) throw new Error('No active round')
    const round = rounds.pop()!
    await this.startRound(round.problem)
  }

  private ensureCurrentRound() {
    const currentChat = this.currentChat
    if (currentChat == null) throw new Error('No active chat')
    const currentRound = currentChat.rounds[currentChat.rounds.length - 1]
    if (currentRound == null) throw new Error('No active round')
    return currentRound
  }

  private async startRound(problem: BasicMarkdownString) {
    const currentChat = this.currentChat
    if (currentChat == null) throw new Error('No active chat')
    currentChat.rounds.push({
      problem,
      answer: null,
      state: RoundState.Loading,
      ctrl: getChildAbortController(currentChat.ctrl),
      error: null
    })
    await this.getCopilotAnswer()
  }

  private ensureChat(): Chat {
    const currentChat = this.currentChat
    if (currentChat == null) throw new Error('No active chat')
    const messages = currentChat.rounds.flatMap((round) => {
      const roundMessages: ChatMessage[] = [{ role: 'user', content: round.problem }]
      if (round.answer != null) roundMessages.push({ role: 'copilot', content: round.answer })
      return roundMessages
    })
    return {
      topic: currentChat.topic,
      messages
    }
  }

  private async getCopilotAnswer() {
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) throw new Error('No active text document') // we may support chat without active text document in the future
    if (this.copilot == null) throw new Error('No copilot')

    const currentRound = this.ensureCurrentRound()
    try {
      const stream = await this.copilot.getChatCompletion(
        {
          textDocument,
          openedTextDocuments: [this.ui.mainTextDocument!, ...this.ui.tempTextDocuments],
          cursorPosition: this.ui.cursorPosition,
          selection: this.ui.selection,
          signal: currentRound.ctrl.signal
        },
        this.ensureChat(),
      )
      let accumulatedText = ''
      for await (const chunk of stream) {
        accumulatedText += chunk
        // Update the current round's answer as chunks arrive
        currentRound.answer = makeBasicMarkdownString(accumulatedText)
        // Keep the loading state while streaming
        currentRound.state = RoundState.Loading
      }

      // Set final state once streaming is complete
      currentRound.state = RoundState.Completed
    } catch (e) {
      if (e instanceof Cancelled) {
        currentRound.state = RoundState.Cancelled
        return
      }
      currentRound.state = RoundState.Failed
      currentRound.error = new ActionException(e, { en: 'Failed to get answer', zh: 'Copilot 出错了' })
    }
  }

  init() {
    this.addDisposer(() => {
      this.currentChat?.ctrl.abort()
    })
  }
}

function getMessageContentToExplainCodeSegment({ textDocument, range, content }: CodeSegment) {
  const codeLink = makeCodeLinkWithRange(textDocument, range)
  const codeBlock = makeCodeBlock(content)
  return makeBasicMarkdownString({
    en: `Explain code ${codeLink}:\n\n${codeBlock}`,
    zh: `解释代码 ${codeLink}：\n\n${codeBlock}`
  })
}

function getMessageContentToExplainSymbolWithDefinition({
  symbol,
  textDocument,
  range
}: ChatExplainTargetSymbolWithDefinition) {
  const codeLink = makeCodeLinkWithRange(textDocument, range, symbol)
  return makeBasicMarkdownString({
    en: `Explain ${codeLink}`,
    zh: `解释 ${codeLink}`
  })
}

function getMessageContentToExplainDefinition({ overview }: ChatExplainTargetDefinition) {
  return makeBasicMarkdownString({
    en: `Explain \`${overview}\``,
    zh: `解释 \`${overview}\``
  })
}

function getMessageContentToReviewCode({ textDocument, range, code }: ChatTopicReview) {
  const codeLink = makeCodeLinkWithRange(textDocument, range)
  const codeBlock = makeCodeBlock(code)
  return makeBasicMarkdownString({
    en: `Review code ${codeLink}:\n\n${codeBlock}`,
    zh: `审查代码 ${codeLink}：\n\n${codeBlock}`
  })
}

function getMessageContentToFixProblem({ textDocument, problem }: ChatTopicFixProblem) {
  const codeLink = makeCodeLinkWithRange(textDocument, problem.range)
  return makeBasicMarkdownString({
    en: `How to fix this problem:\n\n${codeLink}\n\n> ${problem.message}`,
    zh: `如何修复这个问题：\n\n${codeLink}\n\n> ${problem.message}`
  })
}

function getTopicMessageContent(topic: ChatTopic): BasicMarkdownString {
  switch (topic.kind) {
    case ChatTopicKind.Inspire:
      return makeBasicMarkdownString(topic.problem)
    case ChatTopicKind.Explain: {
      const target = topic.target
      switch (target.kind) {
        case ChatExplainKind.CodeSegment:
          return getMessageContentToExplainCodeSegment(target.codeSegment)
        case ChatExplainKind.SymbolWithDefinition:
          return getMessageContentToExplainSymbolWithDefinition(target)
        case ChatExplainKind.Definition:
          return getMessageContentToExplainDefinition(target)
      }
      throw new Error(`Unknown explain target kind: ${(target as any).kind}`)
    }
    case ChatTopicKind.Review:
      return getMessageContentToReviewCode(topic)
    case ChatTopicKind.FixProblem:
      return getMessageContentToFixProblem(topic)
  }
}

function getChildAbortController(parent: AbortController) {
  const ctrl = new AbortController()
  function onParentAbort() {
    ctrl.abort(parent.signal.reason)
  }
  if (parent.signal.aborted) {
    onParentAbort()
  } else {
    parent.signal.addEventListener('abort', onParentAbort)
  }
  return ctrl
}
