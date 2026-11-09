import { ref, shallowRef } from 'vue'
import Emitter from '@/utils/emitter'
import { ActionException, capture, type Exception } from '@/utils/exception'
import type { ReadinessScope } from '@/utils/readiness'
import type { ProgressReporter } from '@/utils/progress'
import { untilNotNull } from '@/utils/utils'
import type { TutorialProject } from '@/models/tutorial/project'
import type { Copilot, Session as CopilotSession, Topic } from '@/components/copilot/copilot'
import type { EditorState } from '@/components/editor/editor-state'
import type { CodeEditor } from '@/components/editor/spx-code-editor'

import { PlaygroundCourseProgram, type PlaygroundCourseCompletion, type PlaygroundCoursePresentation } from './program'
import { APIWhitelist } from './api-whitelist'
import { Ruler } from './ruler'

export type PlaygroundCourseSessionOptions = {
  project: TutorialProject
  editorState: EditorState
  copilot: Copilot
  presentation: PlaygroundCoursePresentation
  readiness: ReadinessScope
  /** Reports Course startup through the first configuration rendering. */
  startReporter: ProgressReporter
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
  private startingRef = ref(true)
  private codeEditorRef = shallowRef<CodeEditor | null>(null)
  private errorRef = shallowRef<Exception | null>(null)

  /** Remains true until Host readiness and initial configuration rendering finish. */
  get starting() {
    return this.startingRef.value
  }

  /** Borrowed from CodeEditorProvider; the Session does not dispose it. */
  get codeEditor() {
    return this.codeEditorRef.value
  }

  setCodeEditor(editor: CodeEditor | null) {
    this.codeEditorRef.value = editor
  }

  /** Session startup or Program failure; used to present the Course restart action. */
  get error() {
    return this.errorRef.value
  }

  constructor(private readonly options: PlaygroundCourseSessionOptions) {
    super()
    this.project = options.project
    this.editorState = options.editorState
    this.copilot = options.copilot
    this.addDisposer(() => {
      this.codeEditorRef.value = null
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
      waitForHostReady: async (signal) => {
        await untilNotNull(this.codeEditorRef, signal)
        await options.readiness.untilReady(signal)
      },
      onStarted: (signal) => this.finishStarting(signal),
      formatWorkspace: async () => {
        if (this.codeEditor == null) throw new Error('Course Code Editor is not ready')
        await this.codeEditor.formatWorkspace()
      },
      onCompleted: (completion) => {
        // Program is disposed on completion; initial rendering still belongs to Session.
        void this.finishStarting(this.getSignal()).catch((error) => {
          if (!this.isDisposed) capture(error, 'Failed to render completed Course')
        })
        this.emit('completed', completion)
      },
      onFailed: (error) => this.fail(error)
    })
    this.addDisposable(this.program)
  }

  async start() {
    if (this.isDisposed || this.program.isDisposed) return
    if (this.started) throw new Error('Playground Course session has already started')
    this.started = true
    this.options.startReporter.startAutoReport(3000, { signal: this.getSignal() })
    try {
      await this.startCopilotSession()
    } catch (error) {
      if (this.isDisposed) return
      this.fail(new ActionException(error, { en: 'Failed to start Copilot session', zh: '无法开始 Copilot 会话' }))
      return
    }
    if (this.isDisposed) return
    await this.program.start()
  }

  private async finishStarting(signal: AbortSignal) {
    await this.options.readiness.untilReady(signal)
    this.options.startReporter.report(1)
    this.startingRef.value = false
  }

  private fail(error: Exception) {
    this.options.startReporter.report(1)
    this.errorRef.value = error
    this.emit('failed', error)
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
