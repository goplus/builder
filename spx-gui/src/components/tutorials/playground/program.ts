import { watch } from 'vue'

import { Disposable } from '@/utils/disposable'
import { XGoExecutor, type XGoExitReason } from '@/utils/xgoexec'
import { ActionException, Cancelled, DefaultException, type Exception } from '@/utils/exception/base'
import { createTutorialFramework, type SpotlightOptions, type TutorialFrameworkHost } from '@/utils/tutorial-framework'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { RuntimeOutputKind } from '@/components/editor/runtime'
import type { PlaygroundCourseSession } from './session'

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
  session: PlaygroundCourseSession
  presentation: PlaygroundCoursePresentation
  formatWorkspace(): Promise<void>
  onCompleted(completion: PlaygroundCourseCompletion): void
  onFailed(error: Exception): void
}

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

    const { session } = this.options
    try {
      this.executorStarted = this.executor.run({ [mainCourseFilePath]: session.project.mainCourse.code })
      this.installEventBridge()
      await this.executorStarted
    } catch (e) {
      if (this.isDisposed) return
      this.finishWithFailure(new ActionException(e, { en: 'Failed to start the course', zh: '无法启动课程' }))
    }
  }

  private createHost(): TutorialFrameworkHost {
    const signal = this.getSignal()
    const { session, presentation, formatWorkspace } = this.options
    return {
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
          filterAPIs: (apis) => session.setAPIWhitelist(apis),
          formatWorkspace: () => formatWorkspace()
        },
        project: {
          getCode: (name) => {
            const sprite = session.project.project.sprites.find((sprite) => sprite.name === name)
            if (sprite == null) throw new Error(`Sprite ${name} not found`)
            return sprite.code
          },
          listSprites: () => session.project.project.sprites.map((sprite) => sprite.name)
        },
        ruler: {
          enable: () => session.setRulerEnabled(true),
          disable: () => session.setRulerEnabled(false)
        }
      },
      copilot: {
        generateText: (content) => session.copilot.generateTextResponse(content, this.getSignal()),
        generateJSON: (content, schema) => session.copilot.generateJSONResponse(content, schema, this.getSignal())
      },
      spotlight: {
        reveal: (target, tip, options) => presentation.revealSpotlight(target, tip, options)
      }
    }
  }

  private installEventBridge() {
    const { session } = this.options
    const runtime = session.editorState.runtime
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
      session.copilot.on('roundComplete', (round) => {
        if (session.copilot.currentSession === session.copilotSession)
          this.dispatchEvent('copilot.roundComplete', round)
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
