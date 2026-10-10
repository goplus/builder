import { watch } from 'vue'

import { Disposable } from '@/utils/disposable'
import { XGoExecutor, type XGoExitReason } from '@/utils/xgoexec'
import { ActionException, Cancelled, DefaultException, type Exception } from '@/utils/exception/base'
import { createTutorialFramework, type SpotlightOptions, type TutorialFrameworkHost } from '@/utils/tutorial-framework'
import { mainCourseFilePath } from '@/models/tutorial/course'
import type { TutorialProject } from '@/models/tutorial/project'
import type { Copilot } from '@/components/copilot/copilot'
import type { EditorState } from '@/components/editor/editor-state'
import { RuntimeOutputKind } from '@/components/editor/runtime'

import type { APIWhitelist } from './api-whitelist'
import type { Ruler } from './ruler'

export type PlaygroundCoursePresentation = {
  showPrelude(content: string, signal: AbortSignal): Promise<void>
  showMessage(content: string, signal: AbortSignal): Promise<void>
  showVideo(videoName: string, signal: AbortSignal): Promise<void>
  revealSpotlight(target: string, tip: string, options: SpotlightOptions): Promise<void>
}

export type PlaygroundCourseCompletion = {
  feedback: string | null
}

export type PlaygroundCourseProgramOptions = {
  project: TutorialProject
  editorState: EditorState
  copilot: Copilot
  apiWhitelist: APIWhitelist
  ruler: Ruler
  presentation: PlaygroundCoursePresentation
  waitForEditor(signal: AbortSignal): Promise<void>
  onStarted(signal: AbortSignal): Promise<void>
  formatWorkspace(): Promise<void>
  onCompleted(completion: PlaygroundCourseCompletion): void
  onFailed(error: Exception): void
}

/**
 * Runs one Course's XGo program, providing capabilities and forwarding editor and Copilot events.
 * Completion or failure disposes Program; the Session keeps the editor available afterwards.
 */
export class PlaygroundCourseProgram extends Disposable {
  private executor: XGoExecutor
  private lastRuntimeOutputID = -1
  private lastError: Exception | null = null
  private executorStarted: Promise<void> | null = null

  constructor(private readonly options: PlaygroundCourseProgramOptions) {
    super()
    this.executor = new XGoExecutor({
      framework: createTutorialFramework(this.createHost()),
      onError: (phase, message) => {
        this.lastError = new DefaultException({
          en: `Tutorial Course failed during ${phase}: ${message}`,
          zh: `教程课程在${phase}阶段失败：${message}`
        })
      },
      onExit: (reason) => this.handleExecutorExit(reason)
    })
    this.addDisposer(() => void this.executor.stop())
  }

  async start() {
    if (this.isDisposed) return
    if (this.executorStarted != null) throw new Error('Playground Course program has already started')

    const { project } = this.options
    try {
      this.executorStarted = this.executor.run({ [mainCourseFilePath]: project.mainCourse.code })
      this.installEventBridge()
      await this.executorStarted
    } catch (e) {
      if (this.isDisposed) return
      this.finishWithFailure(new ActionException(e, { en: 'Failed to start the course', zh: '无法启动课程' }))
    }
  }

  private createHost(): TutorialFrameworkHost {
    const signal = this.getSignal()
    const { project, copilot, apiWhitelist, ruler, presentation, formatWorkspace } = this.options
    return {
      lifecycle: {
        waitForEditor: () => {
          signal.throwIfAborted()
          return this.options.waitForEditor(signal)
        },
        started: () => {
          signal.throwIfAborted()
          return this.options.onStarted(signal)
        }
      },
      course: {
        showPrelude: async (content) => {
          if (signal.aborted) throw new Cancelled(signal.reason)
          await presentation.showPrelude(content, signal)
        },
        showMessage: async (content) => {
          if (signal.aborted) throw new Cancelled(signal.reason)
          await presentation.showMessage(content, signal)
        },
        showVideo: async (videoName) => {
          if (signal.aborted) throw new Cancelled(signal.reason)
          await presentation.showVideo(videoName, signal)
        },
        complete: async () => this.acceptCompletion(null),
        completeWith: async (content) => this.acceptCompletion(content)
      },
      editor: {
        codeEditor: {
          filterAPIs: (apis) => apiWhitelist.set(apis),
          formatWorkspace: () => formatWorkspace()
        },
        project: {
          getCode: (name) => {
            const sprite = project.project.sprites.find((sprite) => sprite.name === name)
            if (sprite == null) throw new Error(`Sprite ${name} not found`)
            return sprite.code
          },
          listSprites: () => project.project.sprites.map((sprite) => sprite.name)
        },
        ruler
      },
      copilot: {
        generateText: (content) => copilot.generateTextResponse(content, signal),
        generateJSON: (content, schema) => copilot.generateJSONResponse(content, schema, signal)
      },
      spotlight: {
        reveal: (target, tip, options) => presentation.revealSpotlight(target, tip, options)
      }
    }
  }

  private installEventBridge() {
    const { editorState, copilot } = this.options
    const copilotSession = copilot.currentSession
    const runtime = editorState.runtime
    this.addDisposer(
      runtime.on('didChangeOutput', () => {
        for (const output of runtime.outputs) {
          if (output.id <= this.lastRuntimeOutputID) continue
          this.lastRuntimeOutputID = output.id
          if (output.kind === RuntimeOutputKind.Log) this.dispatchEvent('editor.runtime.log', { log: output.message })
        }
      })
    )
    this.addDisposer(runtime.on('didExit', (code) => this.dispatchEvent('editor.runtime.exit', { code })))
    this.addDisposer(
      watch(
        () => runtime.running,
        (running, previous) => {
          const started = running.mode === 'debug' && !running.initializing && running.initializingError == null
          const wasStarted = previous?.mode === 'debug' && !previous.initializing && previous.initializingError == null
          if (started && !wasStarted) this.dispatchEvent('editor.runtime.start', null)
        },
        { immediate: true }
      )
    )
    this.addDisposer(
      copilot.on('roundComplete', (round) => {
        if (copilot.currentSession === copilotSession) this.dispatchEvent('copilot.roundComplete', round)
      })
    )
  }

  private async dispatchEvent(name: string, payload: unknown) {
    try {
      await this.executorStarted
      if (this.isDisposed) return
      await this.executor.dispatchEvent(name, payload)
    } catch (error) {
      if (!this.isDisposed) console.warn('Failed to dispatch Course event', name, error)
    }
  }

  private acceptCompletion(feedback: string | null) {
    if (this.isDisposed) return
    this.dispose()
    this.options.onCompleted({ feedback })
  }

  private handleExecutorExit(reason: XGoExitReason) {
    if (this.isDisposed) return
    if (reason === 'completed') {
      this.finishWithFailure(
        new DefaultException({ en: 'Tutorial Course exited without completion', zh: '课程退出运行，但未完成' })
      )
    } else {
      this.finishWithFailure(
        this.lastError ?? new DefaultException({ en: 'Tutorial Course exited with error', zh: '课程运行时发生错误' })
      )
    }
  }

  private finishWithFailure(error: Exception) {
    if (this.isDisposed) return
    this.dispose()
    this.options.onFailed(error)
  }
}
