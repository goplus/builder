import Emitter from '@/utils/emitter'
import { ActionException, type Exception } from '@/utils/exception'
import type { TutorialProject } from '@/models/tutorial/project'
import type { Copilot, Session as CopilotSession, Topic } from '@/components/copilot/copilot'
import type { EditorState } from '@/components/editor/editor-state'

import { PlaygroundCourseProgram, type PlaygroundCourseCompletion, type PlaygroundCoursePresentation } from './program'
import { APIWhitelist } from './api-whitelist'
import { Ruler } from './ruler'

export type PlaygroundCourseSessionOptions = {
  project: TutorialProject
  editorState: EditorState
  copilot: Copilot
  presentation: PlaygroundCoursePresentation
  formatWorkspace(): Promise<void>
}

/**
 * Holds the Course's editor session, including UI state, Copilot session and Program.
 * It remains available for editing after Program completes, and is disposed on Course leave.
 */
export class PlaygroundCourseSession extends Emitter<{
  completed: PlaygroundCourseCompletion
  failed: Exception
}> {
  readonly project: TutorialProject
  readonly editorState: EditorState
  readonly apiWhitelist = new APIWhitelist()
  readonly ruler = new Ruler()
  private readonly copilot: Copilot
  private readonly program: PlaygroundCourseProgram
  private copilotSession: CopilotSession | null = null
  private started = false

  constructor(options: PlaygroundCourseSessionOptions) {
    super()
    this.project = options.project
    this.editorState = options.editorState
    this.copilot = options.copilot
    this.addDisposer(() => {
      if (this.copilotSession != null && this.copilot.currentSession === this.copilotSession)
        this.copilot.endCurrentSession()
    })
    this.program = new PlaygroundCourseProgram({
      project: this.project,
      editorState: this.editorState,
      copilot: this.copilot,
      apiWhitelist: this.apiWhitelist,
      ruler: this.ruler,
      presentation: options.presentation,
      formatWorkspace: options.formatWorkspace,
      onCompleted: (completion) => this.emit('completed', completion),
      onFailed: (error) => this.emit('failed', error)
    })
    this.addDisposable(this.program)
  }

  async start() {
    if (this.isDisposed || this.program.isDisposed) return
    if (this.started) throw new Error('Playground Course session has already started')
    this.started = true
    try {
      await this.startCopilotSession()
    } catch (error) {
      if (this.isDisposed) return
      this.emit(
        'failed',
        new ActionException(error, { en: 'Failed to start Copilot session', zh: '无法开始 Copilot 会话' })
      )
      return
    }
    if (this.isDisposed) return
    await this.program.start()
  }

  private async startCopilotSession() {
    const topic: Topic = {
      title: { en: this.project.title, zh: this.project.title },
      description: `You are assisting the learner in the Playground Course: ${this.project.title}.\n\n${this.project.config?.copilotContext ?? ''}`,
      reactToEvents: false,
      endable: true,
      codeHelperEnabled: false
    }
    const starting = this.copilot.startSession(topic)
    this.copilotSession = this.copilot.currentSession
    await starting
  }
}
