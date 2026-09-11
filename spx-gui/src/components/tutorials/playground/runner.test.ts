import { nextTick, reactive, shallowReactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { XGoExecutorOptions } from '@/utils/xgoexec'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import { RoundState, type Round, type Topic } from '@/components/copilot/copilot'
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
  const session = shallowReactive<{ currentRound: Round | null }>({ currentRound: null })
  let currentSession: { currentRound: Round | null } | null = null
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
      })
    }
  }
}

function makeHarness() {
  const project = makeProject()
  const editorRuntime = new Runtime(project.project)
  const editorState = { runtime: editorRuntime } as EditorState
  const { session, controller: copilot } = makeCopilot()
  const presentation = {
    showMessage: vi.fn().mockResolvedValue(undefined)
  }
  const runner = new PlaygroundCourseRunner({
    project,
    editorState,
    copilot: copilot as unknown as Copilot,
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
      description: 'Help with this Course',
      reactToEvents: false,
      endable: true
    })
    expect(harness.executor.run).toHaveBeenCalledWith({
      [mainCourseFilePath]: 'onStart => { complete }'
    })
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
    harness.session.currentRound = reactive({
      state: RoundState.Completed,
      userMessage: { type: 'text', role: 'user', content: 'help' },
      resultMessages: [{ role: 'copilot', content: 'done' }]
    }) as Round

    await vi.waitFor(() => expect(harness.executor.dispatchEvent).toHaveBeenCalledTimes(5))
    expect(harness.executor.dispatchEvent.mock.calls).toEqual([
      ['editor.runtime.start', null],
      ['editor.runtime.log', { log: 'first' }],
      ['editor.runtime.log', { log: 'second' }],
      ['editor.runtime.exit', { code: 0 }],
      [
        'copilot.roundFinish',
        {
          userMessage: { type: 'text', role: 'user', content: 'help' },
          resultMessages: [{ role: 'copilot', content: 'done' }]
        }
      ]
    ])
    vi.unstubAllGlobals()
  })

  it('publishes completion for its owner to dispose', async () => {
    const harness = makeHarness()
    const completed = vi.fn()
    harness.runner.on('completed', completed)
    await harness.runner.start()
    const completeWith = harness.getExecutorOptions().framework?.capabilities.course_completeWith
    if (completeWith == null) throw new Error('course_completeWith capability not found')

    await completeWith({ feedback: 'Nice work' })

    await vi.waitFor(() => expect(completed).toHaveBeenCalledWith({ feedback: 'Nice work' }))
    expect(harness.executor.stop).not.toHaveBeenCalled()
    expect(harness.copilot.endCurrentSession).not.toHaveBeenCalled()

    harness.runner.dispose()

    expect(harness.executor.stop).toHaveBeenCalledOnce()
    expect(harness.copilot.endCurrentSession).toHaveBeenCalledOnce()
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
