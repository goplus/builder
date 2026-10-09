import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { XGoExecutorOptions } from '@/utils/xgoexec'
import { until } from '@/utils/utils'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { Sprite } from '@/models/spx/sprite'
import { TutorialProject } from '@/models/tutorial/project'
import { type CopilotRound, type Topic } from '@/components/copilot/copilot'
import { Runtime, RuntimeOutputKind } from '@/components/editor/runtime'
import type { EditorState } from '@/components/editor/editor-state'
import type { Copilot } from '@/components/copilot/copilot'
import { DefaultException } from '@/utils/exception'

import { PlaygroundCourseSession } from './session'

const executorMocks = vi.hoisted(() => ({
  instances: [] as Array<{
    options: XGoExecutorOptions
    run: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    dispatchEvent: ReturnType<typeof vi.fn>
  }>
}))

vi.mock('@/utils/xgoexec', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/xgoexec')>()
  return {
    ...actual,
    XGoExecutor: class {
      constructor(options: XGoExecutorOptions) {
        const instance = {
          options,
          run: vi.fn().mockResolvedValue(undefined),
          stop: vi.fn().mockResolvedValue(undefined),
          dispatchEvent: vi.fn().mockResolvedValue(undefined)
        }
        executorMocks.instances.push(instance)
        return instance
      }
    }
  }
})

function makeProject() {
  const project = new TutorialProject()
  project.title = 'Build a game'
  project.config = {
    project: { type: 'spx', root: 'project' },
    inEditorPath: '/sprites/Bird/code',
    copilotContext: 'Help with this Course'
  }
  project.mainCourse.code = 'onStart => { complete }'
  return project
}

function makeCopilot() {
  const session = {}
  let currentSession: object | null = null
  const roundCompleteListeners = new Set<(round: CopilotRound) => void>()
  return {
    session,
    controller: {
      get currentSession() {
        return currentSession
      },
      replaceSession(session: object) {
        currentSession = session
      },
      startSession: vi.fn(async (_topic: Topic) => {
        currentSession = session
      }),
      endCurrentSession: vi.fn(() => {
        currentSession = null
      }),
      on: vi.fn((_event: 'roundComplete', listener: (round: CopilotRound) => void) => {
        roundCompleteListeners.add(listener)
        return () => roundCompleteListeners.delete(listener)
      }),
      emitRoundComplete(round: CopilotRound) {
        roundCompleteListeners.forEach((listener) => listener(round))
      },
      generateTextResponse: vi.fn(),
      generateJSONResponse: vi.fn()
    }
  }
}

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

function makeHarness() {
  const project = makeProject()
  const editorRuntime = new Runtime(project.project)
  const editorState = { runtime: editorRuntime, dispose: vi.fn() } as unknown as EditorState
  const { session, controller: copilot } = makeCopilot()
  const presentation = {
    showPrelude: vi.fn().mockResolvedValue(undefined),
    showVideo: vi.fn().mockResolvedValue(undefined),
    showMessage: vi.fn().mockResolvedValue(undefined),
    revealSpotlight: vi.fn().mockResolvedValue(undefined)
  }
  const formatWorkspace = vi.fn().mockResolvedValue(undefined)
  const waitForEditor = vi.fn().mockResolvedValue(undefined)
  const onStarted = vi.fn().mockResolvedValue(undefined)
  const courseSession = new PlaygroundCourseSession({
    project,
    editorState,
    copilot: copilot as unknown as Copilot,
    presentation,
    formatWorkspace,
    waitForEditor,
    onStarted
  })
  const executor = executorMocks.instances.at(-1)!
  const harness = {
    project,
    editorRuntime,
    editorState,
    session,
    copilot,
    executor,
    presentation,
    formatWorkspace,
    waitForEditor,
    onStarted,
    courseSession,
    getExecutorOptions: () => executor.options
  }
  cleanups.push(() => {
    courseSession.dispose()
    editorState.dispose()
    editorRuntime.dispose()
    project.dispose()
  })
  return harness
}

describe('PlaygroundCourseSession', () => {
  beforeEach(() => {
    executorMocks.instances.length = 0
  })

  it('starts one Playground Copilot session and the main Course program', async () => {
    const harness = makeHarness()

    await harness.courseSession.start()

    expect(harness.copilot.startSession).toHaveBeenCalledOnce()
    expect(harness.copilot.startSession).toHaveBeenCalledWith({
      title: { en: 'Build a game', zh: 'Build a game' },
      description: 'You are assisting the learner in the Playground Course: Build a game.\n\nHelp with this Course',
      reactToEvents: false,
      endable: true,
      codeHelperEnabled: false
    })
    expect(harness.executor.run).toHaveBeenCalledWith({
      [mainCourseFilePath]: 'onStart => { complete }'
    })
  })

  it('waits for editor readiness and startup rendering acknowledgments', async () => {
    const harness = makeHarness()
    let ready!: () => void
    harness.waitForEditor.mockImplementationOnce(() => new Promise<void>((resolve) => (ready = resolve)))
    const capabilities = harness.getExecutorOptions().framework!.capabilities
    const acknowledged = vi.fn()
    const waiting = Promise.resolve(capabilities.lifecycle_waitForEditor(null)).then(acknowledged)
    await Promise.resolve()
    expect(acknowledged).not.toHaveBeenCalled()
    ready()
    await waiting
    expect(acknowledged).toHaveBeenCalledOnce()

    let rendered!: () => void
    harness.onStarted.mockImplementationOnce(() => new Promise<void>((resolve) => (rendered = resolve)))
    const rendering = Promise.resolve(capabilities.lifecycle_started(null)).then(acknowledged)
    await Promise.resolve()
    expect(acknowledged).toHaveBeenCalledOnce()
    rendered()
    await rendering
    expect(acknowledged).toHaveBeenCalledTimes(2)
  })

  it.each(['lifecycle_waitForEditor', 'lifecycle_started'])(
    'cancels %s on disposal and rejects obsolete lifecycle calls',
    async (name) => {
      const harness = makeHarness()
      harness.waitForEditor.mockImplementation((signal: AbortSignal) => until(() => false, signal))
      harness.onStarted.mockImplementation((signal: AbortSignal) => until(() => false, signal))
      const capability = harness.getExecutorOptions().framework!.capabilities[name]
      const waiting = Promise.resolve(capability(null))
      const cancelled = expect(waiting).rejects.toThrow('cancelled')
      harness.courseSession.dispose()
      await cancelled
      expect(() => capability(null)).toThrow('cancelled')
      const replacement = makeHarness()
      await replacement.getExecutorOptions().framework!.capabilities.lifecycle_waitForEditor(null)
      await replacement.getExecutorOptions().framework!.capabilities.lifecycle_started(null)
      expect(replacement.waitForEditor).toHaveBeenCalledOnce()
      expect(replacement.onStarted).toHaveBeenCalledOnce()
    }
  )

  it('updates the API whitelist', async () => {
    const harness = makeHarness()
    await harness.courseSession.start()
    const filterAPIs = harness.getExecutorOptions().framework?.capabilities.editor_codeEditor_filterAPIs
    if (filterAPIs == null) throw new Error('editor_codeEditor_filterAPIs capability not found')

    await filterAPIs({ apis: ['xgo:github.com/goplus/spx/v3?Sprite.stepTo#0'] })

    expect(harness.courseSession.apiWhitelist.apis).toEqual(['xgo:github.com/goplus/spx/v3?Sprite.stepTo#0'])
  })

  it('forwards editor and Copilot events in source order', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queueMicrotask(() => callback(performance.now()))
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const harness = makeHarness()
    await harness.courseSession.start()

    harness.editorRuntime.setRunning({ mode: 'debug', initializing: false }, 'files-hash')
    await nextTick()
    await vi.waitFor(() => expect(harness.executor.dispatchEvent).toHaveBeenCalledTimes(1))

    harness.editorRuntime.addOutput({ kind: RuntimeOutputKind.Log, time: 1, message: 'first' })
    harness.editorRuntime.addOutput({ kind: RuntimeOutputKind.Error, time: 2, message: 'ignored' })
    harness.editorRuntime.addOutput({ kind: RuntimeOutputKind.Log, time: 3, message: 'second' })
    await vi.waitFor(() => expect(harness.executor.dispatchEvent).toHaveBeenCalledTimes(3))

    harness.editorRuntime.emit('didExit', 0)
    harness.copilot.emitRoundComplete({ userMessage: 'help', resultMessages: ['done'] })

    await vi.waitFor(() => expect(harness.executor.dispatchEvent).toHaveBeenCalledTimes(5))
    expect(harness.executor.dispatchEvent.mock.calls).toEqual([
      ['editor.runtime.start', null],
      ['editor.runtime.log', { log: 'first' }],
      ['editor.runtime.log', { log: 'second' }],
      ['editor.runtime.exit', { code: 0 }],
      [
        'copilot.roundComplete',
        {
          userMessage: 'help',
          resultMessages: ['done']
        }
      ]
    ])
    vi.unstubAllGlobals()
  })

  it('drops events waiting for startup when the session is disposed', async () => {
    const harness = makeHarness()
    let finishStartup!: () => void
    harness.executor.run.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishStartup = resolve
        })
    )
    const failed = vi.fn()
    harness.courseSession.on('failed', failed)
    const starting = harness.courseSession.start()
    await vi.waitFor(() => expect(harness.executor.run).toHaveBeenCalledOnce())
    harness.editorRuntime.emit('didExit', 0)
    harness.courseSession.dispose()
    finishStartup()
    await starting
    expect(harness.executor.dispatchEvent).not.toHaveBeenCalled()
    expect(failed).not.toHaveBeenCalled()
  })

  it('provides Copilot generation without adding a learner round', async () => {
    const harness = makeHarness()
    await harness.courseSession.start()
    harness.copilot.generateTextResponse.mockResolvedValueOnce('Great work')
    harness.copilot.generateJSONResponse.mockResolvedValueOnce({ complete: true })

    const capabilities = harness.getExecutorOptions().framework?.capabilities
    const generateText = capabilities?.copilot_generateText
    const generateJSON = capabilities?.copilot_generateJSON
    if (generateText == null || generateJSON == null) throw new Error('Copilot capabilities not found')

    await expect(generateText({ content: 'Give feedback' })).resolves.toBe('Great work')
    await expect(generateJSON({ content: 'Is the goal complete?', schema: { type: 'object' } })).resolves.toEqual({
      complete: true
    })
    expect(harness.copilot.generateTextResponse).toHaveBeenCalledWith('Give feedback', expect.any(AbortSignal))
    expect(harness.copilot.generateJSONResponse).toHaveBeenCalledWith(
      'Is the goal complete?',
      { type: 'object' },
      expect.any(AbortSignal)
    )
  })

  it('disposes the program on completion while retaining the editor and Copilot session', async () => {
    const harness = makeHarness()
    const completed = vi.fn()
    harness.courseSession.on('completed', completed)
    await harness.courseSession.start()
    const completeWith = harness.getExecutorOptions().framework?.capabilities.course_completeWith
    if (completeWith == null) throw new Error('course_completeWith capability not found')

    await completeWith({ content: 'Nice work' })

    expect(completed).toHaveBeenCalledWith({ feedback: 'Nice work' })
    expect(harness.courseSession.isDisposed).toBe(false)
    expect(harness.editorState.dispose).not.toHaveBeenCalled()
    expect(harness.executor.stop).toHaveBeenCalledOnce()
    expect(harness.copilot.endCurrentSession).not.toHaveBeenCalled()

    harness.courseSession.dispose()

    expect(harness.executor.stop).toHaveBeenCalledOnce()
    expect(harness.copilot.endCurrentSession).toHaveBeenCalledOnce()
  })

  it('forwards Spotlight requests to the course presentation', async () => {
    const harness = makeHarness()
    const reveal = harness.getExecutorOptions().framework?.capabilities.spotlight_reveal
    if (reveal == null) throw new Error('spotlight_reveal capability not found')

    await reveal({ target: 'api-references', tip: 'Use this block.', options: { mask: true, duration: 0 } })

    expect(harness.presentation.revealSpotlight).toHaveBeenCalledWith('api-references', 'Use this block.', {
      mask: true,
      duration: 0
    })
  })

  it('updates ruler availability in the session', async () => {
    const harness = makeHarness()
    const { editor_ruler_disable: disable, editor_ruler_enable: enable } =
      harness.getExecutorOptions().framework?.capabilities ?? {}
    if (enable == null || disable == null) throw new Error('ruler capabilities not found')

    await enable(null)
    expect(harness.courseSession.ruler.enabled).toBe(true)
    await disable(null)
    expect(harness.courseSession.ruler.enabled).toBe(false)
  })

  it('disposes the program on failure without disposing the session', async () => {
    const harness = makeHarness()
    const failed = vi.fn()
    harness.courseSession.on('failed', failed)
    await harness.courseSession.start()

    harness.getExecutorOptions().onExit?.('error')

    await vi.waitFor(() =>
      expect(failed).toHaveBeenCalledWith(
        new DefaultException({ en: 'Tutorial Course exited with error', zh: '课程运行时发生错误' })
      )
    )
    expect(harness.executor.stop).toHaveBeenCalledOnce()
    expect(harness.courseSession.isDisposed).toBe(false)

    harness.courseSession.dispose()

    expect(harness.executor.stop).toHaveBeenCalledOnce()
  })
  it('reads the current session project and discovers learner-created sprites', async () => {
    const harness = makeHarness()
    const sprite = new Sprite('Lita')
    sprite.setCode('step 100')
    harness.project.project.addSprite(sprite)
    const capabilities = harness.getExecutorOptions().framework!.capabilities
    expect(capabilities.editor_project_getCode({ sprite: 'Lita' })).toBe('step 100')
    sprite.setCode('stepTo Mushroom')
    expect(capabilities.editor_project_getCode({ sprite: 'Lita' })).toBe('stepTo Mushroom')
    harness.project.project.addSprite(new Sprite('Mushroom'))
    expect(capabilities.editor_project_listSprites(null)).toEqual(['Lita', 'Mushroom'])
    expect(() => capabilities.editor_project_getCode({ sprite: 'Missing' })).toThrow('Sprite Missing not found')
  })

  it('waits for workspace formatting', async () => {
    const harness = makeHarness()
    let finish!: () => void
    harness.formatWorkspace.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const formatted = vi.fn()
    const call = harness.getExecutorOptions().framework!.capabilities.editor_codeEditor_formatWorkspace(null)
    void Promise.resolve(call).then(formatted)
    await Promise.resolve()
    expect(formatted).not.toHaveBeenCalled()
    finish()
    await call
    expect(formatted).toHaveBeenCalledOnce()
  })

  it('opens overlapping presentations directly and cancels them at completion', async () => {
    const harness = makeHarness()
    harness.presentation.showPrelude.mockImplementationOnce(
      (_content: string, signal: AbortSignal) =>
        new Promise<void>((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })
        )
    )
    harness.presentation.showMessage.mockImplementationOnce(
      (_content: string, signal: AbortSignal) =>
        new Promise<void>((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })
        )
    )
    const capabilities = harness.getExecutorOptions().framework!.capabilities
    const prelude = capabilities.course_showPrelude({ content: 'Opening' })
    const message = capabilities.course_showMessage({ content: 'Hint' })
    expect(harness.presentation.showPrelude).toHaveBeenCalledOnce()
    expect(harness.presentation.showMessage).toHaveBeenCalledOnce()
    const cancelled = Promise.allSettled([prelude, message])
    await capabilities.course_complete(null)
    expect((await cancelled).map((result) => result.status)).toEqual(['rejected', 'rejected'])
    await expect(capabilities.course_showVideo({ videoName: 'step-to' })).rejects.toThrow('cancelled')
    expect(harness.presentation.showVideo).not.toHaveBeenCalled()
  })

  it('delegates named videos and settles active presentation when disposed', async () => {
    const harness = makeHarness()
    harness.presentation.showVideo.mockImplementationOnce(
      (_name: string, signal: AbortSignal) =>
        new Promise<void>((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })
        )
    )
    const call = harness.getExecutorOptions().framework!.capabilities.course_showVideo({ videoName: 'step-to' })
    expect(harness.presentation.showVideo).toHaveBeenCalledWith('step-to', expect.any(AbortSignal))
    const cancelled = expect(call).rejects.toThrow('cancelled')
    harness.courseSession.dispose()
    await cancelled
  })

  it('preserves accepted completion when the executor exits with a later error', async () => {
    const harness = makeHarness()
    const completed = vi.fn()
    const failed = vi.fn()
    harness.courseSession.on('completed', completed)
    harness.courseSession.on('failed', failed)
    await harness.getExecutorOptions().framework!.capabilities.course_completeWith({ content: 'Done' })
    harness.getExecutorOptions().onError?.('runtime', 'Presentation cancelled')
    harness.getExecutorOptions().onExit?.('error')
    expect(completed).toHaveBeenCalledWith({ feedback: 'Done' })
    expect(failed).not.toHaveBeenCalled()
  })

  it('keeps the first completion and stops event forwarding', async () => {
    const harness = makeHarness()
    await harness.courseSession.start()
    const completed = vi.fn()
    harness.courseSession.on('completed', completed)
    const capabilities = harness.getExecutorOptions().framework!.capabilities
    await capabilities.course_completeWith({ content: 'First' })
    await capabilities.course_completeWith({ content: 'Second' })
    harness.editorRuntime.emit('didExit', 0)
    await nextTick()
    await Promise.resolve()
    harness.getExecutorOptions().onExit?.('completed')
    harness.getExecutorOptions().onExit?.('completed')
    expect(completed).toHaveBeenCalledExactlyOnceWith({ feedback: 'First' })
    expect(harness.executor.dispatchEvent).not.toHaveBeenCalled()
  })

  it('cancels generation immediately on completion', async () => {
    const harness = makeHarness()
    harness.copilot.generateTextResponse.mockImplementationOnce(
      (_content: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })
        )
    )
    const capabilities = harness.getExecutorOptions().framework!.capabilities
    const text = capabilities.copilot_generateText({ content: 'Text' })
    const cancelled = expect(text).rejects.toThrow('cancelled')
    await capabilities.course_complete(null)
    await cancelled
    expect(harness.courseSession.isDisposed).toBe(false)
  })

  it('retains API and ruler state after completion and borrows the editor and project', async () => {
    const harness = makeHarness()
    const capabilities = harness.getExecutorOptions().framework!.capabilities
    await capabilities.editor_codeEditor_filterAPIs({ apis: ['stepTo'] })
    await capabilities.editor_ruler_enable(null)
    await capabilities.course_complete(null)
    expect(harness.courseSession.apiWhitelist.apis).toEqual(['stepTo'])
    expect(harness.courseSession.ruler.enabled).toBe(true)
    harness.courseSession.dispose()
    harness.courseSession.dispose()
    expect(harness.editorState.dispose).not.toHaveBeenCalled()
    expect(harness.project.isDisposed).toBe(false)
    expect(harness.executor.stop).toHaveBeenCalledOnce()
  })

  it('cleans up disposal during Copilot startup without starting the executor', async () => {
    const harness = makeHarness()
    let finish!: () => void
    const startSession = harness.copilot.startSession.getMockImplementation()!
    harness.copilot.startSession.mockImplementationOnce(async (topic) => {
      await startSession(topic)
      await new Promise<void>((resolve) => {
        finish = resolve
      })
    })
    const starting = harness.courseSession.start()
    harness.courseSession.dispose()
    await Promise.resolve()
    finish()
    await starting
    expect(harness.copilot.endCurrentSession).toHaveBeenCalledOnce()
    expect(harness.executor.run).not.toHaveBeenCalled()
  })

  it('reports Copilot startup failure once without running the program', async () => {
    const harness = makeHarness()
    harness.copilot.startSession.mockRejectedValueOnce(new Error('Copilot unavailable'))
    const failed = vi.fn()
    harness.courseSession.on('failed', failed)
    await expect(harness.courseSession.start()).resolves.toBeUndefined()
    expect(failed).toHaveBeenCalledOnce()
    expect(harness.executor.run).not.toHaveBeenCalled()
    expect(harness.executor.stop).not.toHaveBeenCalled()
    expect(harness.courseSession.isDisposed).toBe(false)
    harness.courseSession.dispose()
  })

  it('retains a replacement Copilot session when the course session is disposed', async () => {
    const harness = makeHarness()
    await harness.courseSession.start()
    const replacement = {}
    harness.copilot.replaceSession(replacement)

    harness.courseSession.dispose()

    expect(harness.copilot.currentSession).toBe(replacement)
    expect(harness.copilot.endCurrentSession).not.toHaveBeenCalled()
    expect(harness.editorState.dispose).not.toHaveBeenCalled()
  })

  it('reports executor startup failure once through the session event', async () => {
    const harness = makeHarness()
    harness.executor.run.mockRejectedValueOnce(new Error('Build failed'))
    const failed = vi.fn()
    harness.courseSession.on('failed', failed)
    await expect(harness.courseSession.start()).resolves.toBeUndefined()
    expect(failed).toHaveBeenCalledOnce()
  })

  it('resolves startup when completion stops the executor during onStart', async () => {
    const harness = makeHarness()
    const completed = vi.fn()
    const failed = vi.fn()
    harness.courseSession.on('completed', completed)
    harness.courseSession.on('failed', failed)
    harness.executor.run.mockImplementationOnce(async () => {
      await harness.getExecutorOptions().framework!.capabilities.course_complete(null)
      throw new Error('XGo executor exited: stopped')
    })
    await expect(harness.courseSession.start()).resolves.toBeUndefined()
    expect(completed).toHaveBeenCalledExactlyOnceWith({ feedback: null })
    expect(failed).not.toHaveBeenCalled()
  })

  it('rejects repeated session startup without replacing Copilot', async () => {
    const harness = makeHarness()
    await harness.courseSession.start()
    await expect(harness.courseSession.start()).rejects.toThrow('already started')
    expect(harness.copilot.startSession).toHaveBeenCalledOnce()
    expect(harness.executor.run).toHaveBeenCalledOnce()
  })

  it('does not run a disposed program', async () => {
    const harness = makeHarness()
    harness.courseSession.dispose()
    await harness.courseSession.start()
    expect(harness.copilot.startSession).not.toHaveBeenCalled()
    expect(harness.executor.run).not.toHaveBeenCalled()
  })
})
