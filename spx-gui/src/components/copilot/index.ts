import { ref } from 'vue'
import { Disposable } from '@/utils/disposable'
import { ActionException, Cancelled } from '@/utils/exception'
import {
  type MCPMarkdownString,
  makeMCPMarkdownString,
} from '@/components/editor/code-editor/common'
export { default as CopilotChat } from './CopilotChat.vue'

export type MessageRole = 'user' | 'copilot'

export type ChatMessage = {
  role: MessageRole
  content: MCPMarkdownString
}

export type Chat = {
  messages: ChatMessage[]
}

export interface ICopilot extends Disposable {
  getChatCompletion(chat: Chat,
    options?: {
      signal?: AbortSignal
    }): AsyncIterableIterator<string>
}

export enum RoundState {
  Loading,
  Completed,
  Cancelled,
  Failed
}

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

type InternalChat = {
  rounds: Round[]
  ctrl: AbortController
}

export class CopilotController extends Disposable {
  constructor(private copilot: ICopilot) {
    super();
  }

  private currentChatRef = ref<InternalChat | null>(null)
  get currentChat(): InternalChat | null {
    return this.currentChatRef.value ?? null
  }

  async startChat(problem: string) {
      const currentChat = this.currentChat
      if (currentChat != null) currentChat.ctrl.abort()
  
      this.currentChatRef.value = {
        rounds: [],
        ctrl: new AbortController()
      }
      await this.startRound(makeMCPMarkdownString(problem))
  }

  endChat() {
    if (this.currentChatRef.value != null) {
      this.currentChatRef.value.ctrl.abort()
      this.currentChatRef.value = null
    }
  }

  async askProblem(problem: string) {
    await this.startRound(makeMCPMarkdownString(problem))
  }

  async toolExecResult(result: string) {
    await this.askProblem(result)
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

  private async startRound(problem: MCPMarkdownString) {
    const currentChat = this.currentChat
    if (currentChat == null) throw new Error('No active chat')
    currentChat.rounds.push({
      problem,
      answer: null,
      toolExecResult: null,
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
      if (round.toolExecResult != null) roundMessages.push({ role: 'user', content: round.toolExecResult })
      return roundMessages
    })
    return {
      messages
    }
  }

  private async getCopilotAnswer() {
    const currentRound = this.ensureCurrentRound()

    currentRound.ctrl.signal

    // 后续使用 context 调用 API
    try {
      const stream = await this.copilot.getChatCompletion(this.ensureChat());
      let accumulatedText = ''
      for await (const chunk of stream) {
        accumulatedText += chunk
        // Update the current round's answer as chunks arrive
        currentRound.answer = makeMCPMarkdownString(accumulatedText)
      }

      // const processedText = await this.processMcpToolCalls(accumulatedText);
      // currentRound.answer = makeBasicMarkdownString(processedText);
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
