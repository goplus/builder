import type { ZodObject, ZodTypeAny } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { debounce } from 'lodash'
import { shallowRef, ref, shallowReactive, type Component } from 'vue'
import type { LocaleMessage } from '@/utils/i18n'
import type { Disposer } from '@/utils/disposable'
import { ActionException, Cancelled } from '@/utils/exception'
import * as apis from '@/apis/copilot'
import { ToolExecutor, type ToolExecution, type ToolExecutionInput } from './tool-executor'
import { tagName as toolUseTagName } from './custom-elements/ToolUse.vue'
import { findCustomComponentUsages } from './MarkdownView.vue'

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
          textContent = `<result>${JSON.stringify(m.execution.result)}</result>`
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
  /** Component to render the topic state indicator, e.g. tip for current tutorial course */
  stateIndicator?: Component<{}>
}

export enum RoundState {
  /** The round is initialized, while not sent to copilot yet. */
  Initialized,
  /** The round is loading, waiting for copilot response. */
  Loading,
  /** The round is in progress, partial copilot response is available. */
  InProgress,
  /** The round has completed successfully */
  Completed,
  /** The round was cancelled by the user */
  Cancelled,
  /** The round failed due to an error */
  Failed
}

export class Round {
  resultMessages: Array<CopilotMessage | ToolMessage> = shallowReactive([])
  private inProgressCopilotMessageContentRef = ref<string | null>(null)
  get inProgressCopilotMessageContent() {
    return this.inProgressCopilotMessageContentRef.value
  }
  private errorRef = ref<ActionException | null>(null)
  get error() {
    return this.errorRef.value
  }
  private stateRef = ref(RoundState.Initialized)
  get state() {
    return this.stateRef.value
  }
  private ctrl = new AbortController()

  constructor(
    public userMessage: UserMessage,
    private copilot: Copilot,
    private session: Session
  ) {
    this.userMessage = userMessage
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
    this.stateRef.value = RoundState.Completed
  }

  private handleResponseError(err: unknown) {
    if (this.ctrl.signal.aborted) {
      err = this.ctrl.signal.reason
    } else {
      this.ctrl.abort(err)
    }
    if (err instanceof Cancelled) {
      this.stateRef.value = RoundState.Cancelled
      return
    }
    this.errorRef.value = new ActionException(err, {
      en: 'Failed to get copilot response',
      zh: '获取 Copilot 响应失败'
    })
    this.stateRef.value = RoundState.Failed
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
      const result = apis.generateStreamMessage('standard', sampledApiMessages, { signal: this.ctrl.signal })
      for await (const chunk of result) {
        if (this.inProgressCopilotMessageContentRef.value == null) {
          this.inProgressCopilotMessageContentRef.value = ''
          this.stateRef.value = RoundState.InProgress
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
    this.stateRef.value = RoundState.Loading
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

// TODO: restore session state after page reload
export class Session {
  topic: Topic
  rounds: Round[] = shallowReactive([])

  constructor(
    topic: Topic,
    private copilot: Copilot
  ) {
    this.topic = topic
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

  addUserMessage(m: UserMessage) {
    this.abortCurrentRound() // TODO: or should we wait for the current round to finish? Then there may be a user message queue
    const round = new Round(m, this.copilot, this)
    this.rounds.push(round)
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

export class Copilot {
  private contextProviders: ICopilotContextProvider[] = shallowReactive([])
  private customElementMap = new Map<string, CustomElementDefinition>()
  private toolMap = new Map<string, ToolDefinition>()

  private getTools(): ToolDefinition[] {
    return Array.from(this.toolMap.values())
  }

  executor = new ToolExecutor(() => this.getTools())

  /** If copilot is active (the panel is visible) */
  private activeRef = shallowRef(false)
  get active() {
    return this.activeRef.value
  }

  private currentSessionRef = shallowRef<Session | null>(null)
  get currentSession() {
    return this.currentSessionRef.value
  }

  private getContext(): string {
    return this.contextProviders.map((provider) => provider.provideContext()).join('\n\n')
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

You can use custom elements in your messages to render specific UI content or invoke additional functionality. For example:

* \`<foo a="1" b='"Hello"' />\` creates a custom element with tag name \`foo\` and attributes \`{ a: "1", b: '"Hello"' }\`.
* \`<bar a="1">Hello</bar>\` creates a custom element with tag name \`bar\` and attributes \`{ a: "1" }\` and content \`Hello\`.

Each custom element has a tag name, a description, and an attributes schema that defines what values are accepted for each attribute.

Here are the custom elements you can use in your messages:

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
    if (tools.length === 0) return "There's no tools available."
    return `# Available tools

${tools.map((tool) => this.getToolPrompt(tool)).join('\n\n')}`
  }

  private getTopicPrompt() {
    if (this.currentSession == null) return ''
    const topic = this.currentSession.topic
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

  /**
   * Start a new session for the copilot.
   * If a session is already running, it will be ended first.
   */
  async startSession(topic: Topic, userMessage?: Message): Promise<void> {
    this.endCurrentSession()
    const session = new Session(topic, this)
    this.currentSessionRef.value = session
    if (userMessage != null) session.addUserMessage(userMessage as UserMessage)
  }

  /** End the current session. */
  endCurrentSession(): void {
    this.currentSession?.abortCurrentRound()
    this.currentSessionRef.value = null
  }

  open() {
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
  addUserMessage(content: string, topic: Topic): void {
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
    if (this.currentSession == null) return
    if (this.currentSession.topic.reactToEvents === false) return
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
