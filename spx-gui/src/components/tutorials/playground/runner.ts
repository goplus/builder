import { watch } from 'vue'
import type { JsonSchema7Type } from 'zod-to-json-schema'

import Emitter from '@/utils/emitter'
import { XGoExecutor, type XGoExitReason, type XGoFramework } from '@/utils/xgoexec'
import { mainCourseFilePath } from '@/models/tutorial/course'
import type { TutorialProject } from '@/models/tutorial/project'
import type { Copilot, Session, Topic } from '@/components/copilot/copilot'
import { RuntimeOutputKind } from '@/components/editor/runtime'
import type { EditorState } from '@/components/editor/editor-state'

export type PlaygroundCoursePresentation = {
  showMessage(content: string): Promise<void>
}

export type PlaygroundCourseCompletion = {
  feedback: string | null
}

export type PlaygroundCourseRunnerOptions = {
  project: TutorialProject
  editorState: EditorState
  copilot: Copilot
  presentation: PlaygroundCoursePresentation
}

export class PlaygroundCourseRunner extends Emitter<{
  completed: PlaygroundCourseCompletion
  failed: Error
}> {
  private executor: XGoExecutor
  private session: Session | null = null
  private eventQueue = Promise.resolve()
  private completion: PlaygroundCourseCompletion | null = null
  private completionTimer: ReturnType<typeof setTimeout> | null = null
  private lastRuntimeOutputID = -1
  private lastError: Error | null = null
  private started = false
  private settled = false
  private executorStarted = deferred<void>()

  constructor(private options: PlaygroundCourseRunnerOptions) {
    super()
    this.executor = new XGoExecutor({
      framework: this.createFramework(),
      onError: (phase, message) => {
        this.lastError = new Error(`Tutorial ${phase}: ${message}`)
      },
      onExit: (reason) => this.handleExecutorExit(reason)
    })
    this.addDisposer(() => void this.executor.stop())
  }

  async start() {
    if (this.started) throw new Error('Playground Course runner has already started')
    this.started = true

    const { project, copilot } = this.options
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

    try {
      await this.executor.run({ [mainCourseFilePath]: project.mainCourse.code })
      if (this.isDisposed) return
      this.executorStarted.resolve()
    } catch (error) {
      this.executorStarted.reject(error)
      if (!this.isDisposed) this.finishWithFailure(errorOf(error))
      throw error
    }
  }

  dispose() {
    if (this.isDisposed) return
    if (this.completionTimer != null) clearTimeout(this.completionTimer)
    this.completionTimer = null
    super.dispose()
  }

  private createFramework(): XGoFramework {
    return {
      name: 'tutorial',
      capabilities: {
        course_showMessage: (request) =>
          this.options.presentation.showMessage((request as { content: string }).content),
        course_complete: () => this.acceptCompletion(null),
        course_completeWith: (request) => this.acceptCompletion((request as { content: string }).content),
        copilot_generateText: (request) =>
          this.options.copilot.generateTextResponse((request as { content: string }).content),
        copilot_generateJSON: (request) => {
          const { content, schema } = request as { content: string; schema: unknown }
          if (!validateJSONSchema(schema)) throw new Error('Invalid JSON Schema')
          return this.options.copilot.generateJSONResponse(content, schema)
        }
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
    const runtime = this.options.editorState.runtime
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
      this.options.copilot.on('roundComplete', (round) => {
        if (this.options.copilot.currentSession === this.session) this.dispatchEvent('copilot.roundComplete', round)
      })
    )
  }

  private dispatchEvent(name: string, payload: unknown) {
    this.eventQueue = this.eventQueue
      .then(async () => {
        await this.executorStarted.promise
        if (this.isDisposed) return
        await this.executor.dispatchEvent(name, payload)
      })
      .catch((error) => {
        if (!this.isDisposed) this.finishWithFailure(errorOf(error))
      })
  }

  private acceptCompletion(feedback: string | null) {
    if (this.completion != null) return
    this.completion = { feedback }
    this.completionTimer = setTimeout(() => {
      this.completionTimer = null
      this.finishWithCompletion()
    })
  }

  private handleExecutorExit(reason: XGoExitReason) {
    if (this.isDisposed) return
    if (reason === 'completed') {
      if (this.completion != null) this.finishWithCompletion()
      else this.finishWithFailure(new Error('Tutorial Course ended without completing'))
      return
    }
    if (reason === 'error') {
      this.finishWithFailure(this.lastError ?? new Error('Tutorial Course failed'))
    }
  }

  private finishWithCompletion() {
    if (this.settled || this.completion == null) return
    this.settled = true
    this.emit('completed', this.completion)
  }

  private finishWithFailure(error: Error) {
    if (this.settled) return
    this.settled = true
    this.emit('failed', error)
  }
}

function isSchemaRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isSchemaMap(value: unknown): value is Record<string, JsonSchema7Type> {
  return isSchemaRecord(value) && Object.values(value).every(validateJSONSchema)
}

/** Checks the JSON Schema shapes emitted by the Tutorial framework before sending them to Copilot. */
export function validateJSONSchema(value: unknown): value is JsonSchema7Type {
  if (!isSchemaRecord(value)) return false

  const schema = value as Record<string, unknown>
  const stringKeys = ['$schema', '$id', '$ref', 'title', 'description', 'format', 'pattern']
  if (stringKeys.some((key) => schema[key] != null && typeof schema[key] !== 'string')) return false

  const numberKeys = [
    'multipleOf',
    'maximum',
    'exclusiveMaximum',
    'minimum',
    'exclusiveMinimum',
    'maxLength',
    'minLength',
    'maxItems',
    'minItems',
    'maxProperties',
    'minProperties'
  ]
  if (numberKeys.some((key) => schema[key] != null && typeof schema[key] !== 'number')) return false

  if (schema.type != null && typeof schema.type !== 'string' && !isStringArray(schema.type)) return false
  if (schema.enum != null && !Array.isArray(schema.enum)) return false
  if (schema.required != null && !isStringArray(schema.required)) return false
  if (schema.properties != null && !isSchemaMap(schema.properties)) return false
  if (schema.patternProperties != null && !isSchemaMap(schema.patternProperties)) return false
  if (schema.definitions != null && !isSchemaMap(schema.definitions)) return false

  const schemaKeys = ['additionalProperties', 'additionalItems', 'not', 'if', 'then', 'else']
  if (
    schemaKeys.some(
      (key) => schema[key] != null && typeof schema[key] !== 'boolean' && !validateJSONSchema(schema[key])
    )
  )
    return false

  if (
    schema.items != null &&
    !validateJSONSchema(schema.items) &&
    !(Array.isArray(schema.items) && schema.items.every(validateJSONSchema))
  )
    return false

  const schemaArrayKeys = ['allOf', 'anyOf', 'oneOf']
  return schemaArrayKeys.every(
    (key) => schema[key] == null || (Array.isArray(schema[key]) && schema[key].every(validateJSONSchema))
  )
}

function errorOf(value: unknown) {
  return value instanceof Error ? value : new Error(String(value))
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
