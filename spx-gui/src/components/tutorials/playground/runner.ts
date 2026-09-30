import { shallowRef, watch } from 'vue'

import Emitter from '@/utils/emitter'
import { XGoExecutor, type XGoExitReason } from '@/utils/xgoexec'
import { ActionException, DefaultException, type Exception } from '@/utils/exception/base'
import { createTutorialFramework, type SpotlightOptions, type TutorialFrameworkHost } from '@/utils/tutorial-framework'
import { mainCourseFilePath } from '@/models/tutorial/course'
import type { TutorialProject } from '@/models/tutorial/project'
import type { Copilot, Session, Topic } from '@/components/copilot/copilot'
import { RuntimeOutputKind } from '@/components/editor/runtime'
import type { EditorState } from '@/components/editor/editor-state'

export type PlaygroundCoursePresentation = {
  showPrelude(content: string, signal: AbortSignal): Promise<void>
  showMessage(content: string, signal: AbortSignal): Promise<void>
  showVideo(videoName: string, signal: AbortSignal): Promise<void>
  revealSpotlight(target: string, tip: string, options: SpotlightOptions): Promise<void>
}

export type PlaygroundCourseCompletion = {
  feedback: string | null
}

export type PlaygroundCourseRunnerOptions = {
  project: TutorialProject
  editorState: EditorState
  copilot: Copilot
  presentation: PlaygroundCoursePresentation
  formatWorkspace(): Promise<void>
}

export class PlaygroundCourseRunner extends Emitter<{
  completed: PlaygroundCourseCompletion
  failed: Exception
}> {
  private executor: XGoExecutor
  private session: Session | null = null
  private eventQueue = Promise.resolve()
  private completion: PlaygroundCourseCompletion | null = null
  private presentationController = new AbortController()
  private lastRuntimeOutputID = -1
  private lastError: Exception | null = null
  private started = false
  private settled = false
  private executorStarted = deferred<void>()
  project: TutorialProject
  editorState: EditorState
  copilot: Copilot
  private presentation: PlaygroundCoursePresentation
  private formatWorkspace: () => Promise<void>

  private apiWhitelistRef = shallowRef<string[] | null>(null)
  get apiWhitelist() {
    return this.apiWhitelistRef.value
  }
  setAPIWhitelist(apis: string[]) {
    this.apiWhitelistRef.value = apis
  }

  private rulerEnabledRef = shallowRef(false)
  get rulerEnabled() {
    return this.rulerEnabledRef.value
  }
  setRulerEnabled(enabled: boolean) {
    this.rulerEnabledRef.value = enabled
  }

  constructor(options: PlaygroundCourseRunnerOptions) {
    super()
    this.project = options.project
    this.editorState = options.editorState
    this.copilot = options.copilot
    this.presentation = options.presentation
    this.formatWorkspace = options.formatWorkspace
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
    if (this.started) throw new Error('Playground Course runner has already started')
    this.started = true

    const { project, copilot } = this
    try {
      await copilot.startSession(this.createCopilotTopic(project))
      this.session = copilot.currentSession
      if (this.isDisposed) {
        if (copilot.currentSession === this.session) copilot.endCurrentSession()
        return
      }
      const session = this.session
      this.addDisposer(() => {
        if (copilot.currentSession === session) copilot.endCurrentSession()
      })
      this.installEventBridge()

      await this.executor.run({ [mainCourseFilePath]: project.mainCourse.code })
      if (this.isDisposed) return
      this.executorStarted.resolve()
    } catch (e) {
      this.executorStarted.reject(e)
      if (!this.isDisposed)
        this.finishWithFailure(new ActionException(e, { en: 'Failed to start the course', zh: '无法启动课程' }))
      throw e
    }
  }

  dispose() {
    if (this.isDisposed) return
    this.presentationController.abort()
    super.dispose()
  }

  private createHost(): TutorialFrameworkHost {
    const signal = this.presentationController.signal
    return {
      course: {
        showPrelude: async (content) => {
          if (!signal.aborted) await this.presentation.showPrelude(content, signal)
        },
        showMessage: async (content) => {
          if (!signal.aborted) await this.presentation.showMessage(content, signal)
        },
        showVideo: async (videoName) => {
          if (!signal.aborted) await this.presentation.showVideo(videoName, signal)
        },
        complete: async () => this.acceptCompletion(null),
        completeWith: async (content) => this.acceptCompletion(content)
      },
      editor: {
        codeEditor: {
          filterAPIs: (apis) => this.setAPIWhitelist(apis),
          formatWorkspace: () => this.formatWorkspace()
        },
        project: {
          getCode: (name) => {
            const sprite = this.project.project.sprites.find((sprite) => sprite.name === name)
            if (sprite == null) throw new Error(`Sprite ${name} not found`)
            return sprite.code
          },
          listSprites: () => this.project.project.sprites.map((sprite) => sprite.name)
        },
        ruler: {
          enable: () => this.setRulerEnabled(true),
          disable: () => this.setRulerEnabled(false)
        }
      },
      copilot: {
        generateText: (content) => this.copilot.generateTextResponse(content, this.getSignal()),
        generateJSON: (content, schema) => this.copilot.generateJSONResponse(content, schema, this.getSignal())
      },
      spotlight: {
        reveal: (target, tip, options) => this.presentation.revealSpotlight(target, tip, options)
      }
    }
  }

  private createCopilotTopic(project: TutorialProject): Topic {
    const context = project.config?.copilotContext ?? ''
    return {
      title: { en: project.title, zh: project.title },
      description: `You are assisting the learner in the Playground Course: ${project.title}.\n\n${context}`,
      reactToEvents: false,
      endable: true,
      codeHelperEnabled: false
    }
  }

  private installEventBridge() {
    const runtime = this.editorState.runtime
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
      this.copilot.on('roundComplete', (round) => {
        if (this.copilot.currentSession === this.session) this.dispatchEvent('copilot.roundComplete', round)
      })
    )
  }

  private dispatchEvent(name: string, payload: unknown) {
    this.eventQueue = this.eventQueue
      .then(async () => {
        await this.executorStarted.promise
        if (this.isDisposed || this.completion != null) return
        await this.executor.dispatchEvent(name, payload)
      })
      .catch((error) => {
        if (!this.isDisposed && this.completion == null)
          this.finishWithFailure(new ActionException(error, { en: 'Failed to dispatch event', zh: '分发事件失败' }))
      })
  }

  private acceptCompletion(feedback: string | null) {
    if (this.completion != null) return
    this.completion = { feedback }
    this.presentationController.abort()
  }

  private handleExecutorExit(reason: XGoExitReason) {
    if (this.isDisposed) return
    if (reason === 'completed') {
      if (this.completion != null) this.finishWithCompletion()
      else
        this.finishWithFailure(
          new DefaultException({ en: 'Tutorial Course exited without completion', zh: '课程退出运行，但未完成' })
        )
      return
    }
    if (reason === 'error') {
      this.finishWithFailure(
        this.lastError ?? new DefaultException({ en: 'Tutorial Course exited with error', zh: '课程运行时发生错误' })
      )
    }
  }

  private finishWithCompletion() {
    if (this.settled || this.completion == null) return
    this.settled = true
    this.emit('completed', this.completion)
  }

  private finishWithFailure(e: Exception) {
    if (this.settled) return
    this.settled = true
    this.emit('failed', e)
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  void promise.catch(() => {})
  return { promise, resolve, reject }
}
