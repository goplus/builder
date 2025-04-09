import { ref } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ActionException, Cancelled } from '@/utils/exception'
import {
  type MCPMarkdownString,
  makeMCPMarkdownString,
} from '@/components/editor/code-editor/common'
export { default as CopilotProvider } from './CopilotProvider.vue'
import { toolResultCollector, type ToolResult } from '@/components/copilot/mcp/collector'

/** Message role identifiers */
export type MessageRole = 'user' | 'copilot'

/** Structure of a single chat message */
export type ChatMessage = {
  role: MessageRole
  content: MCPMarkdownString
}

/** Chat session structure */
export type Chat = {
  messages: ChatMessage[]
}

/** Core Copilot interface for AI completions */
export interface ICopilot extends Disposable {
  getChatCompletion(chat: Chat,
    options?: {
      signal?: AbortSignal
    }): AsyncIterableIterator<string>
}

/** Conversation round state */
export enum RoundState {
  Loading,
  Completed,
  Cancelled,
  Failed
}

/** 
 * Structure of a conversation round
 * Represents a single Q&A exchange with the AI
 */
export type Round = {
  problem: MCPMarkdownString
  /** 
   * Answer provided by the copilot.
   * `null` means the answer is still loading or the round is cancelled by the user.
   */
  answer: MCPMarkdownString | null
  toolExecResult: MCPMarkdownString | null
  error: ActionException | null
  state: RoundState
  ctrl: AbortController
}

/** Internal chat state representation */
type InternalChat = {
  rounds: Round[]
  ctrl: AbortController
}

/**
 * Controller for Copilot functionality
 * Manages conversation state and tool result handling
 */
export class CopilotController extends Disposable {
  private copilot: ICopilot
  /**
   * Creates a new controller with the specified Copilot implementation
   * @param copilot The implementation of ICopilot to use
   */
  constructor(copilot: ICopilot) {
    super()
    this.copilot = copilot
  }

  /**
   * Process results from tool executions
   * @param results Array of tool execution results
   */
  private handleToolResults(results: ToolResult[]) {
    // Sort results by timestamp
    const sortedResults = [...results].sort((a, b) => a.timestamp - b.timestamp)
    
    // Format results as text
    const formattedResults = sortedResults.map(r => 
      `[use-mcp-tool for '${r.server || ""}'] Tool '${r.tool}' execution result: ${JSON.stringify(r.result, null, 2)}`
    )
    
    this.sendBatchResults(formattedResults)
  }
  
  /**
   * Send a batch of tool results as a single message
   * @param results Tool execution results to send
   */
  private async sendBatchResults(results: string[]) {
    if (results.length === 0) return
    
    // Combine multiple results into a single message
    const combinedResult = results.length === 1
      ? results[0]
      : `Multiple tool execution results:\n\n${results.join('\n\n')}`
      
    await this.askProblem(combinedResult)
  }

  /** Current active chat reference */
  private currentChatRef = ref<InternalChat | null>(null)
  
  /** Current active chat or null if none exists */
  get currentChat(): InternalChat | null {
    return this.currentChatRef.value ?? null
  }

  /**
   * Start a new chat session with an initial question
   * @param problem Initial user question
   */
  async startChat(problem: string) {
      const currentChat = this.currentChat
      if (currentChat != null) currentChat.ctrl.abort()
  
      this.currentChatRef.value = {
        rounds: [],
        ctrl: new AbortController()
      }
      await this.startRound(makeMCPMarkdownString(problem))
  }

  /** Terminate the current chat session */
  endChat() {
    if (this.currentChatRef.value != null) {
      this.currentChatRef.value.ctrl.abort()
      this.currentChatRef.value = null
    }

    toolResultCollector.clearAllTasks()
  }

  /**
   * Send a follow-up question in the current chat
   * @param problem User question text
   */
  async askProblem(problem: string) {
    await this.startRound(makeMCPMarkdownString(problem))
  }

  /** Cancel the current conversation round */
  cancelCurrentRound() {
    const currentRound = this.ensureCurrentRound()
    if (currentRound.state !== RoundState.Loading)
      throw new Error(`Current round can not be cancelled, state: ${currentRound.state}`)
    currentRound.ctrl.abort(new Cancelled())
  }

  /** Retry the most recent conversation round */
  async retryCurrentRound() {
    const rounds = this.currentChat?.rounds
    if (rounds == null || rounds.length === 0) throw new Error('No active round')
    const round = rounds.pop()!
    await this.startRound(round.problem)
  }

  /**
   * Get the current active round or throw if none exists
   * @returns The current round
   */
  private ensureCurrentRound() {
    const currentChat = this.currentChat
    if (currentChat == null) throw new Error('No active chat')
    const currentRound = currentChat.rounds[currentChat.rounds.length - 1]
    if (currentRound == null) throw new Error('No active round')
    return currentRound
  }

  /**
   * Start a new conversation round
   * @param problem User question as markdown
   */
  private async startRound(problem: MCPMarkdownString) {
    const currentChat = this.currentChat
    if (currentChat == null) throw new Error('No active chat')
    try {
      currentChat.rounds.push({
        problem,
        answer: null,
        toolExecResult: null,
        state: RoundState.Loading,
        ctrl: getChildAbortController(currentChat.ctrl),
        error: null
      })
      await this.getCopilotAnswer()
    } finally {
      const result = await toolResultCollector.processQueue()
      this.handleToolResults(result)
    }
  }

  /**
   * Format current chat history for API consumption
   * @returns Formatted chat history
   */
  private ensureChat(): Chat {
    const currentChat = this.currentChat
    if (currentChat == null) throw new Error('No active chat')
    const messages = currentChat.rounds.flatMap((round) => {
      const roundMessages: ChatMessage[] = [{ role: 'user', content: round.problem }]
      if (round.answer != null) roundMessages.push({ role: 'copilot', content: round.answer })
      if (round.toolExecResult != null) roundMessages.push({ role: 'user', content: round.toolExecResult })
      return roundMessages
    })
    return {
      messages
    }
  }

  /**
   * Request and process Copilot's answer for the current round
   */
  private async getCopilotAnswer() {
    const currentRound = this.ensureCurrentRound()

    try {
      const stream = await this.copilot.getChatCompletion(this.ensureChat(), {
        signal: currentRound.ctrl.signal
      });
      let accumulatedText = ''
      for await (const chunk of stream) {
        accumulatedText += chunk
        // Update the current round's answer as chunks arrive
        currentRound.answer = makeMCPMarkdownString(accumulatedText)
      }

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

  /** 
   * Initialize controller and register cleanup
   */
  init() {
    this.addDisposer(() => {
      this.currentChat?.ctrl.abort()
    })
  }
}

/**
 * Create a child AbortController that aborts when parent aborts
 * @param parent Parent AbortController
 * @returns Child AbortController
 */
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