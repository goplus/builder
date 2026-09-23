import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { XGoExecutorOptions } from '@/utils/xgoexec'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import { type CopilotRound, type Topic } from '@/components/copilot/copilot'
import { Runtime, RuntimeOutputKind } from '@/components/editor/runtime'
import type { EditorState } from '@/components/editor/editor-state'
import type { Copilot } from '@/components/copilot/copilot'

import { PlaygroundCourseRunner } from './runner'

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

function makeHarness() {
  const project = makeProject()
  const editorRuntime = new Runtime(project.project)
  const editorState = { runtime: editorRuntime } as EditorState
  const { session, controller: copilot } = makeCopilot()
  const presentation = {
    showMessage: vi.fn().mockResolvedValue(undefined),
    revealSpotlight: vi.fn().mockResolvedValue(undefined),
    setRulerEnabled: vi.fn()
  }
  const setAPIWhitelist = vi.fn()
  const runner = new PlaygroundCourseRunner({
    project,
    editorState,
    copilot: copilot as unknown as Copilot,
    codeEditor: {} as never,
    setAPIWhitelist,
    presentation
  })
  const executor = executorMocks.instances.at(-1)!
  return {
    project,
    editorRuntime,
    editorState,
    session,
    copilot,
    executor,
    presentation,
    setAPIWhitelist,
    runner,
    getExecutorOptions: () => executor.options
  }
}

describe('PlaygroundCourseRunner', () => {
  beforeEach(() => {
    executorMocks.instances.length = 0
  })

  it('starts one Playground Copilot session and the main Course program', async () => {
    const harness = makeHarness()

    await harness.runner.start()

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

  it('updates the API whitelist', async () => {
    const harness = makeHarness()
    await harness.runner.start()
    const filterAPIs = harness.getExecutorOptions().framework?.capabilities.editor_codeEditor_filterAPIs
    if (filterAPIs == null) throw new Error('editor_codeEditor_filterAPIs capability not found')

    await filterAPIs({ apis: ['xgo:github.com/goplus/spx/v3?Sprite.stepTo#0'] })

    expect(harness.setAPIWhitelist).toHaveBeenCalledWith(['xgo:github.com/goplus/spx/v3?Sprite.stepTo#0'])
  })

  it('forwards editor and Copilot events in source order', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queueMicrotask(() => callback(performance.now()))
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const harness = makeHarness()
    await harness.runner.start()

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

  it('provides Copilot generation without adding a learner round', async () => {
    const harness = makeHarness()
    await harness.runner.start()
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
    expect(harness.copilot.generateTextResponse).toHaveBeenCalledWith('Give feedback')
    expect(harness.copilot.generateJSONResponse).toHaveBeenCalledWith('Is the goal complete?', { type: 'object' })
  })

  it('publishes completion for its owner to dispose', async () => {
    const harness = makeHarness()
    const completed = vi.fn()
    harness.runner.on('completed', completed)
    await harness.runner.start()
    const completeWith = harness.getExecutorOptions().framework?.capabilities.course_completeWith
    if (completeWith == null) throw new Error('course_completeWith capability not found')

    await completeWith({ content: 'Nice work' })

    await vi.waitFor(() => expect(completed).toHaveBeenCalledWith({ feedback: 'Nice work' }))
    expect(harness.executor.stop).not.toHaveBeenCalled()
    expect(harness.copilot.endCurrentSession).not.toHaveBeenCalled()

    harness.runner.dispose()

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

  it('forwards ruler visibility requests to the course presentation', async () => {
    const harness = makeHarness()
    const { editor_ruler_disable: disable, editor_ruler_enable: enable } =
      harness.getExecutorOptions().framework?.capabilities ?? {}
    if (enable == null || disable == null) throw new Error('ruler capabilities not found')

    await enable(null)
    await disable(null)

    expect(harness.presentation.setRulerEnabled).toHaveBeenNthCalledWith(1, true)
    expect(harness.presentation.setRulerEnabled).toHaveBeenNthCalledWith(2, false)
  })

  it('publishes executor failures for its owner to dispose', async () => {
    const harness = makeHarness()
    const failed = vi.fn()
    harness.runner.on('failed', failed)
    await harness.runner.start()

    harness.getExecutorOptions().onExit?.('error')

    await vi.waitFor(() => expect(failed).toHaveBeenCalledWith(new Error('Tutorial Course failed')))
    expect(harness.executor.stop).not.toHaveBeenCalled()

    harness.runner.dispose()

    expect(harness.executor.stop).toHaveBeenCalledOnce()
  })
})
