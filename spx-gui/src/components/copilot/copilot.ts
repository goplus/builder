import type { ZodObject, ZodTypeAny } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { debounce, throttle } from 'lodash'
import { shallowRef, ref, shallowReactive, type Component, watch } from 'vue'
import { localStorageRef } from '@/utils/utils'
import type { LocaleMessage } from '@/utils/i18n'
import { Disposable, type Disposer } from '@/utils/disposable'
import { ActionException, Cancelled, capture } from '@/utils/exception'
import * as apis from '@/apis/copilot'
import { ToolExecutor, type ToolExecution, type ToolExecutionInput } from './tool-executor'
import { tagName as toolUseTagName } from './custom-elements/ToolUse'
import { findCustomComponentUsages } from './MarkdownView.vue'
import dayjs from 'dayjs'
import { ApiException, type ApiExceptionMeta } from '@/apis/common/exception'

/** Message with text content. */
export type TextMessage = {
  type: 'text'
  role: 'user' | 'copilot'
  content: string
}

export type UserTextMessage = TextMessage & {
  role: 'user'
}

/**
 * Message for user events.
 * For example, the user opened a project, or the user ran a project, etc.
 */
export type UserEventMessage = {
  type: 'event'
  role: 'user'
  /**
   * Name of the event, for display purpose.
   * The name should be localized, e.g. { en: 'Project Runner Exit with 0', zh: '项目运行正常退出' }
   */
  name: LocaleMessage
  /** Detailed description of the event, for prompt purpose. */
  detail: string
}

export type UserMessage = UserTextMessage | UserEventMessage

export type CopilotMessage = TextMessage & {
  role: 'copilot'
}

export type ToolMessage = {
  role: 'tool'
  callId: string
  execution: ToolExecution
}

export type Message = UserMessage | CopilotMessage | ToolMessage

export function toApiMessage(m: Message): apis.Message {
  let textContent: string
  switch (m.role) {
    case 'user':
      switch (m.type) {
        case 'text':
          textContent = m.content
          break
        case 'event':
          textContent = `<event>${m.detail}</event>`
          break
      }
      break
    case 'copilot':
      textContent = m.content
      break
    case 'tool':
      switch (m.execution.state) {
        case 'executing':
          textContent = 'Executing tool...'
          break
        case 'completed':
          textContent = `<tool-result id="${m.callId}">${JSON.stringify(m.execution.result)}</tool-result>`
          break
        case 'failed':
          textContent = `Tool execution failed: ${m.execution.error}`
          break
      }
      break
  }
  return {
    role: m.role === 'tool' ? 'user' : m.role, // TODO: remove me
    content: {
      type: 'text',
      text: textContent
    }
  }
}

export type Topic = {
  /** Name of the topic, for display purpose. */
  title: LocaleMessage
  /**
   * Description of the topic. Sample:
   * * "Now you are about to help the user to fix a bug in the code."
   * * "Now you will help the user to finish learning a course. The course is about ..."
   */
  description: string
  /** Whether the copilot should react to user events under the topic */
  reactToEvents: boolean
  /** Whether the session can be ended by the user, defaults to `true` */
  endable?: boolean
  /** Component (name) to render the topic state indicator, e.g. tip for current tutorial course */
  stateIndicator?: string
}

export enum RoundState {
  /** The round is initialized, while not sent to copilot yet. */
  Initialized = 'initialized',
  /** The round is loading, waiting for copilot response. */
  Loading = 'loading',
  /** The round is in progress, partial copilot response is available. */
  InProgress = 'in-progress',
  /** The round has completed successfully */
  Completed = 'completed',
  /** The round was cancelled by the user */
  Cancelled = 'cancelled',
  /** The round failed due to an error */
  Failed = 'failed'
}

export interface IMessageStreamGenerator {
  generateStreamMessage: typeof apis.generateStreamMessage
}

// NOTE: Keep backward compatibility of `RoundExported` to avoid errors when loading old sessions.
type RoundExported = {
  userMessage: UserMessage
  resultMessages: Array<CopilotMessage | ToolMessage>
  inProgressCopilotMessageContent: string | null
  error: LocaleMessage | null
  state: RoundState
  updatedAt?: number | null
  apiExceptionCode?: number | null
  apiExceptionMeta?: ApiExceptionMeta | null
}

export class Round {
  resultMessages: Array<CopilotMessage | ToolMessage> = shallowReactive([])
  private inProgressCopilotMessageContentRef = ref<string | null>(null)
  get inProgressCopilotMessageContent() {
    return this.inProgressCopilotMessageContentRef.value
  }
  private errorRef = ref<LocaleMessage | null>(null)
  /** Error message */
  get error() {
    return this.errorRef.value
  }

  /** When the round state changes, consider whether `updatedAt` needs to be updated. */
  private stateRef = ref(RoundState.Initialized)
  get state() {
    return this.stateRef.value
  }
  private setState(state: RoundState) {
    this.stateRef.value = state
    this.updatedAt = dayjs().valueOf()
  }

  private ctrl = new AbortController()

  constructor(
    public userMessage: UserMessage,
    private copilot: Copilot,
    private session: Session
  ) {
    this.userMessage = userMessage
    this.updatedAt = dayjs().valueOf()
  }

  /**
   * Not all `state changes` require updating `updatedAt`.
   * For example, when restoring from `load` function, the state change describes a previous state and does not represent new user interaction.
   */
  updatedAt: number

  /**
   * API exception code when the round failed.
   * Non-null indicates an api exception occurred
   * refer to `ApiExceptionCode` for the list of possible values.
   */
  apiExceptionCode?: number | null
  /**
   * API exception meta data when the round failed.
   */
  apiExceptionMeta?: ApiExceptionMeta | null

  export(): RoundExported {
    return {
      userMessage: this.userMessage,
      resultMessages: this.resultMessages,
      inProgressCopilotMessageContent: this.inProgressCopilotMessageContent,
      error: this.error,
      state: this.state,
      updatedAt: this.updatedAt,
      apiExceptionCode: this.apiExceptionCode,
      apiExceptionMeta: this.apiExceptionMeta
    }
  }

  static load(exported: RoundExported, copilot: Copilot, session: Session): Round {
    const round = new Round(exported.userMessage, copilot, session)
    round.resultMessages.push(...exported.resultMessages)
    round.inProgressCopilotMessageContentRef.value = exported.inProgressCopilotMessageContent
    round.errorRef.value = exported.error
    round.updatedAt = exported.updatedAt != null ? exported.updatedAt : dayjs().valueOf()
    round.apiExceptionCode = exported.apiExceptionCode
    round.apiExceptionMeta = exported.apiExceptionMeta
    switch (exported.state) {
      case RoundState.Loading:
      case RoundState.InProgress:
        // We will not resume the ongoing request, so we consider it as cancelled.
        round.stateRef.value = RoundState.Cancelled
        break
      default:
        round.stateRef.value = exported.state
    }
    return round
  }

  private sealInProgressCopilotMessage(): CopilotMessage {
    const content = this.inProgressCopilotMessageContentRef.value
    if (content == null) throw new Error('No in-progress copilot message content to seal')
    this.inProgressCopilotMessageContentRef.value = null
    return {
      role: 'copilot',
      type: 'text',
      content
    }
  }

  private completeRound() {
    this.setState(RoundState.Completed)
  }

  private handleResponseError(err: unknown) {
    if (this.ctrl.signal.aborted) {
      err = this.ctrl.signal.reason
    } else {
      this.ctrl.abort(err)
    }
    if (err instanceof Cancelled) {
      this.setState(RoundState.Cancelled)
      return
    }

    if (err instanceof ApiException) {
      this.apiExceptionCode = err.code
      this.apiExceptionMeta = err.meta
    }

    this.errorRef.value = new ActionException(err, {
      en: 'Failed to get copilot response',
      zh: '获取 Copilot 响应失败'
    }).userMessage
    this.setState(RoundState.Failed)
  }

  private async handleCopilotMessage(message: CopilotMessage) {
    this.resultMessages.push(message)
    const ccus = findCustomComponentUsages(message.content, this.copilot)
    const toolExecutionInputs: ToolExecutionInput[] = []
    for (const ccu of ccus) {
      if (ccu.name !== toolUseTagName) continue
      const props = ccu.props
      const id = props.id + ''
      toolExecutionInputs.push({ ...props, id })
    }
    if (toolExecutionInputs.length === 0) {
      this.completeRound()
      return
    }
    const toolMessages = await Promise.all(
      toolExecutionInputs.map(async (calling) => {
        await this.copilot.executor.execute(calling)
        const execution = this.copilot.executor.getExecution(calling.id)
        if (execution == null) throw new Error(`Tool execution with ID ${calling.id} not found`)
        return {
          role: 'tool',
          callId: calling.id,
          execution
        } satisfies ToolMessage
      })
    )
    this.resultMessages.push(...toolMessages)
    this.generateCopilotMessage()
  }

  private async generateCopilotMessage() {
    try {
      const messages = this.session.rounds.flatMap((round) => [round.userMessage, ...round.resultMessages])
      messages.push(this.copilot.getContextMessage())
      const apiMessages = messages.map(toApiMessage)
      // TODO: history summarization with LLM instead of truncation
      const sampledApiMessages = sampleApiMessages(apiMessages)
      const result = this.copilot.generator.generateStreamMessage('standard', sampledApiMessages, {
        signal: this.ctrl.signal
      })
      for await (const chunk of result) {
        if (this.inProgressCopilotMessageContentRef.value == null) {
          this.inProgressCopilotMessageContentRef.value = ''
          this.setState(RoundState.InProgress)
        }
        this.inProgressCopilotMessageContentRef.value += chunk
      }
      const message = this.sealInProgressCopilotMessage()
      this.handleCopilotMessage(message)
    } catch (err) {
      this.handleResponseError(err)
    }
  }

  start() {
    this.resultMessages.length = 0
    this.inProgressCopilotMessageContentRef.value = null
    this.errorRef.value = null
    this.apiExceptionCode = null
    this.apiExceptionMeta = null
    this.setState(RoundState.Loading)
    this.ctrl = new AbortController()
    this.generateCopilotMessage()
  }

  abort() {
    if (this.state === RoundState.Loading || this.state === RoundState.InProgress) {
      this.ctrl.abort(new Cancelled())
    }
  }

  retry() {
    this.abort()
    this.start()
  }
}

// NOTE: Keep backward compatibility of `SessionExported` to avoid errors when loading old sessions.
export type SessionExported = {
  topic: Topic
  rounds: RoundExported[]
}

export class Session {
  topic: Topic
  rounds: Round[] = shallowReactive([])

  private maxRounds = 10

  constructor(
    topic: Topic,
    private copilot: Copilot
  ) {
    this.topic = topic
  }

  export(): SessionExported {
    return {
      topic: this.topic,
      rounds: this.rounds.map((round) => round.export())
    }
  }

  static load(exported: SessionExported, copilot: Copilot): Session {
    const session = new Session(exported.topic, copilot)
    session.rounds.push(...exported.rounds.map((round) => Round.load(round, copilot, session)))
    return session
  }

  get currentRound() {
    return this.rounds[this.rounds.length - 1] ?? null
  }

  abortCurrentRound() {
    this.currentRound?.abort()
  }

  private startCurrentRound() {
    this.currentRound?.start()
  }

  private startCurrentRoundWithDelay = debounce(() => this.startCurrentRound(), 1000)

  // Limit the number of rounds to prevent excessive historical messages
  private limitRounds() {
    if (this.rounds.length > this.maxRounds) {
      this.rounds.splice(0, this.rounds.length - this.maxRounds)
    }
  }

  addUserMessage(m: UserMessage) {
    this.abortCurrentRound() // TODO: or should we wait for the current round to finish? Then there may be a user message queue
    const round = new Round(m, this.copilot, this)
    this.rounds.push(round)
    this.limitRounds()
    if (m.type === 'event' && this.rounds.length > 1) {
      // If the user event is added in the middle of a session,
      // we delay the starting of the current round to introduce batching.
      this.startCurrentRoundWithDelay()
    } else {
      this.startCurrentRound()
    }
  }
}

/**
 * ICopilotContextProvider is interface for copilot-context-providers.
 * It provides context information which is sent to the copilot together with chat messages.
 */
export interface ICopilotContextProvider {
  /**
   * Provide context information for the copilot.
   * Use plain text in English.
   */
  provideContext(): string
}

/** A quick input represents a UI element (typically a button) which helps the user to quickly send some message */
export type QuickInput = {
  /** Text for the quick input, will be displayed on the UI element */
  text: LocaleMessage
  /** Message to send when the user accepts the quick input */
  message: UserMessage
}

/** IQuickInputProvider is an interface for quick input providers. */
export interface IQuickInputProvider {
  /** Provide quick inputs based on the last copilot message. */
  provideQuickInput(
    /** The last copilot message, may not exist. */
    lastCopilotMessage: CopilotMessage | null,
    /** The current topic, may not exist. */
    topic: Topic | null
  ): QuickInput[]
}

export type CustomElementDefinition = {
  /** Tag name for the tool. */
  tagName: string
  /**
   * Description of the tool about what it does and how to use it.
   * It will be used in the copilot's prompt.
   */
  description: string
  /** Attributes definition for the tool (Element). */
  attributes: ZodObject<any>
  /**
   * Whether the component is raw, that can include lines without exiting, just like `pre`/`textarea` tags.
   * See details in https://github.com/micromark/micromark/blob/774a70c6bae6dd94486d3385dbd9a0f14550b709/packages/micromark-util-html-tag-name/readme.md#htmlrawnames
   */
  isRaw: boolean
  /** Component to render the tool in the UI. */
  component: Component
}

export type ToolImplementation = (params: any, signal?: AbortSignal) => Promise<unknown>

export type ToolDefinition = {
  /** Name of the function. */
  name: string
  /** Description of the function about what it does and how to use it. */
  description: string
  /** Parameters definition for the function. */
  parameters: ZodObject<any>
  /** Function to call when the tool is used. */
  implementation: ToolImplementation
}

function stringifyZodSchema(schema: ZodTypeAny): string {
  const { $schema, ...pruned } = zodToJsonSchema(schema)
  return JSON.stringify(pruned)
}

export interface ISessionExportedStorage {
  set(value: SessionExported | null): void
  get(): SessionExported | null
}

/**
 * The maximum idle time (in milliseconds) allowed after the last Round state change.
 * If the time since the last round update exceeds this value, the session will be ended upon reopening.
 * Defaults to 2 hours.
 */
const defaultIdleTimeout = 2 * 60 * 60 * 1000

const defaultTopic: Topic = {
  title: { en: 'New chat', zh: '新会话' },
  description: '',
  reactToEvents: false
}

export class Copilot extends Disposable {
  private contextProviders: ICopilotContextProvider[] = shallowReactive([])
  private quickInputProviders: IQuickInputProvider[] = shallowReactive([])
  private customElementMap = new Map<string, CustomElementDefinition>()
  private toolMap = new Map<string, ToolDefinition>()
  private stateIndicatorComponentMap: Map<string, Component> = shallowReactive(new Map())

  private getTools(): ToolDefinition[] {
    return Array.from(this.toolMap.values())
  }

  get stateIndicatorComponent(): Component<{}> | null {
    const name = this.currentSession?.topic.stateIndicator
    if (name == null) return null
    return this.stateIndicatorComponentMap.get(name) ?? null
  }

  executor = new ToolExecutor(() => this.getTools())

  constructor(public generator: IMessageStreamGenerator = apis) {
    super()
  }

  /** If copilot is active (the panel is visible) */
  private activeRef = localStorageRef('spx-gui-copilot-active', false)
  get active() {
    return this.activeRef.value
  }

  private currentSessionRef = shallowRef<Session | null>(null)
  get currentSession() {
    return this.currentSessionRef.value
  }

  private getContext(): string {
    return this.contextProviders
      .map((provider) => provider.provideContext())
      .filter((s) => s.trim() !== '')
      .join('\n\n')
  }

  private getCustomElementPrompt(customElement: CustomElementDefinition) {
    return `### \`${customElement.tagName}\`
${customElement.description}
Attributes schema:
\`\`\`json
${stringifyZodSchema(customElement.attributes)}
\`\`\``
  }

  private getCustomElementsPrompt() {
    const customElements = this.getCustomElements()
    if (customElements.length === 0) return ''
    return `# Available custom elements

${customElements.map((ce) => this.getCustomElementPrompt(ce)).join('\n\n')}`
  }

  private getToolPrompt(tool: ToolDefinition) {
    return `### Tool \`${tool.name}\`
${tool.description}
Parameters schema:
\`\`\`json
${stringifyZodSchema(tool.parameters)}
\`\`\``
  }

  private getToolsPrompt() {
    const tools = this.getTools()
    if (tools.length === 0) return "# Available tools\nThere's no tools available."
    return `# Available tools

${tools.map((tool) => this.getToolPrompt(tool)).join('\n\n')}`
  }

  private getTopicPrompt() {
    if (this.currentSession == null) return ''
    const topic = this.currentSession.topic
    if (topic.description.trim() === '') return ''
    return `# Current topic between you and user

${topic.description}`
  }

  getContextMessage(): UserTextMessage {
    const parts = [this.getCustomElementsPrompt(), this.getToolsPrompt(), this.getContext(), this.getTopicPrompt()]
    const content = `<context>
${parts.filter((p) => p.trim() !== '').join('\n\n')}
</context>`
    return {
      type: 'text',
      role: 'user',
      content
    }
  }

  getCustomElements(): CustomElementDefinition[] {
    return Array.from(this.customElementMap.values())
  }

  getQuickInputs(): QuickInput[] {
    const session = this.currentSession
    const topic = session?.topic ?? null
    const lastRound = session?.rounds.at(-1)
    if (lastRound != null && lastRound.state !== RoundState.Completed) return []
    const lastMessage = lastRound?.resultMessages.at(-1)
    const lastCopilotMessage = lastMessage?.role === 'copilot' ? lastMessage : null
    return this.quickInputProviders.map((provider) => provider.provideQuickInput(lastCopilotMessage, topic)).flat()
  }

  /**
   * Start a new session for the copilot.
   * If a session is already running, it will be ended first.
   */
  async startSession(topic: Topic, userMessage?: Message): Promise<void> {
    this.open()
    this.endCurrentSession()
    const session = new Session(topic, this)
    this.currentSessionRef.value = session
    if (userMessage != null) session.addUserMessage(userMessage as UserMessage)
  }

  /**
   * Check for idle timeout when copilot is reopened, ending the session if idle too long
   */
  private checkIdleTimeout() {
    const session = this.currentSession
    if (session == null || this.activeRef.value) return

    const lastRoundUpdatedTime = session.currentRound?.updatedAt
    if (lastRoundUpdatedTime == null) return

    // Check idle timeout when reopening copilot
    // Terminates session if lastRoundUpdatedTime is too old (user was idle for too long)
    if (dayjs().valueOf() - lastRoundUpdatedTime > defaultIdleTimeout) {
      this.endCurrentSession()
    }
  }

  syncSessionWith(storage: ISessionExportedStorage): void {
    try {
      const saved = storage.get()
      if (saved != null) {
        this.currentSessionRef.value = Session.load(saved, this)
      }
    } catch (e) {
      capture(e, 'Failed to load session from storage')
    }

    this.addDisposer(
      watch(
        () => this.currentSession?.export() ?? null,
        // inProgressCopilotMessageContent may change quite often when streaming, so we throttle the save operation
        throttle((exported: SessionExported | null) => {
          storage.set(exported)
        }, 300)
      )
    )
  }

  /** End the current session. */
  endCurrentSession(): void {
    this.currentSession?.abortCurrentRound()
    this.currentSessionRef.value = null
  }

  /** Open copilot, checks idle timeout and may end the current session if conditions are met */
  open() {
    this.checkIdleTimeout()
    this.activeRef.value = true
  }

  close() {
    this.currentSession?.abortCurrentRound()
    this.activeRef.value = false
  }

  /**
   * Add a user message in current session.
   * If no session is running, a new session will be started with given message and topic.
   */
  addUserTextMessage(content: string, topic: Topic = defaultTopic): void {
    this.open()
    const userMessage: UserTextMessage = {
      type: 'text',
      role: 'user',
      content
    }
    if (this.currentSession == null) {
      this.startSession(topic, userMessage)
    } else {
      this.currentSession.addUserMessage(userMessage)
    }
  }

  /**
   * Notify the copilot of a user event.
   * If no session is running, nothing will happen.
   */
  notifyUserEvent(name: LocaleMessage, detail: string): void {
    this.checkIdleTimeout()
    if (this.currentSession == null) return
    if (this.currentSession.topic.reactToEvents === false) return
    this.open()
    const userEventMessage: UserEventMessage = {
      type: 'event',
      role: 'user',
      name,
      detail
    }
    this.currentSession.addUserMessage(userEventMessage)
  }

  /** Register a context provider for the copilot. */
  registerContextProvider(provider: ICopilotContextProvider): Disposer {
    this.contextProviders.push(provider)
    return () => {
      const index = this.contextProviders.indexOf(provider)
      if (index !== -1) this.contextProviders.splice(index, 1)
    }
  }

  registerQuickInputProvider(provider: IQuickInputProvider): Disposer {
    this.quickInputProviders.push(provider)
    return () => {
      const index = this.quickInputProviders.indexOf(provider)
      if (index !== -1) this.quickInputProviders.splice(index, 1)
    }
  }

  registerCustomElement(customElement: CustomElementDefinition): Disposer {
    this.customElementMap.set(customElement.tagName, customElement)
    return () => {
      if (this.customElementMap.get(customElement.tagName) === customElement) {
        this.customElementMap.delete(customElement.tagName)
      }
    }
  }

  registerTool(tool: ToolDefinition): Disposer {
    this.toolMap.set(tool.name, tool)
    return () => {
      if (this.toolMap.get(tool.name) === tool) {
        this.toolMap.delete(tool.name)
      }
    }
  }

  registerStateIndicatorComponent(name: string, component: Component): Disposer {
    if (this.stateIndicatorComponentMap.has(name))
      console.warn(`State indicator component with name "${name}" already exists`)
    this.stateIndicatorComponentMap.set(name, component)
    return () => {
      if (this.stateIndicatorComponentMap.get(name) !== component) return
      this.stateIndicatorComponentMap.delete(name)
    }
  }
}

export function sampleApiMessages(
  messages: apis.Message[],
  limit = 100_000 // Context size for Deepseek V3 / Kimi K2: 128K
): apis.Message[] {
  let totalSize = 0
  const sampled: apis.Message[] = []
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const size = msg.content.text.length
    if (totalSize + size > limit) break
    totalSize += size
    sampled.unshift(msg)
  }
  return sampled
}
