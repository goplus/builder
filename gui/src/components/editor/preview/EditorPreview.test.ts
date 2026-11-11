import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Cancelled } from '@/utils/exception'
import { SpxProject } from '@/models/spx/project'
import { DiagnosticSeverity, type WorkspaceDiagnostics } from '@/components/xgo-code-editor/common'
import { Runtime } from '../runtime'
import EditorPreview from './EditorPreview.vue'

const { useEditorCtx, useCodeEditor, useConfirmDialog } = vi.hoisted(() => ({
  useEditorCtx: vi.fn(),
  useCodeEditor: vi.fn(),
  useConfirmDialog: vi.fn()
}))
vi.mock('../EditorContextProvider.vue', () => ({ useEditorCtx }))
vi.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (msg: { en: string }) => msg.en }) }))
vi.mock('@/stores/user', () => ({ useSignedIn: () => ({ user: null, username: null }) }))
vi.mock('@/utils/network', async () => {
  const { ref } = await import('vue')
  return { useNetwork: () => ({ isOnline: ref(true) }) }
})
vi.mock('@/utils/exception', async (importOriginal) => {
  const { ref } = await import('vue')
  return {
    ...(await importOriginal<object>()),
    capture: vi.fn(),
    useMessageHandle: (fn: () => Promise<unknown>) => ({ fn, isLoading: ref(false) })
  }
})
vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useConfirmDialog
}))
vi.mock('@/components/project', () => ({ usePublishProject: () => vi.fn() }))
vi.mock('../spx-code-editor', () => ({
  useCodeEditor,
  DiagnosticSeverity: { Error: 'error' },
  textDocumentId2CodeFileName: () => ({ en: 'Stage', zh: '舞台' }),
  getInvalidMonitors: async () => []
}))
vi.mock('./stage-viewer/StageViewer.vue', () => ({ default: { template: '<div />' } }))

const disposers: Array<() => void> = []
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()))

function mountPreview(simpleMode = false) {
  const project = new SpxProject()
  const runtime = new Runtime(project)
  useEditorCtx.mockReturnValue({ project, state: { runtime } })
  const diagnosticWorkspace = vi.fn<(signal?: AbortSignal) => Promise<WorkspaceDiagnostics>>(async () => ({
    items: []
  }))
  const revealDiagnostics = vi.fn()
  const getAttachedUI = vi.fn(() => ({ revealDiagnostics }))
  useCodeEditor.mockReturnValue({ diagnosticWorkspace, getAttachedUI })
  const confirm = vi.fn(async () => {})
  useConfirmDialog.mockReturnValue(confirm)
  const run = vi.fn(async () => 'files-hash')
  const stop = vi.fn(async () => {})
  const wrapper = shallowMount(EditorPreview, {
    props: { simpleMode },
    global: {
      directives: { radar: {} },
      mocks: { $t: (msg: { en: string }) => msg.en },
      renderStubDefaultSlot: true,
      stubs: {
        ProjectRunnerSurface: {
          name: 'ProjectRunnerSurface',
          props: ['onRun', 'onRerun', 'onStop'],
          template: '<div />',
          methods: {
            run,
            stop,
            async rerun() {
              await stop()
              return run()
            }
          }
        }
      }
    }
  })
  disposers.push(
    () => wrapper.unmount(),
    () => runtime.dispose()
  )
  const surface = wrapper.getComponent({ name: 'ProjectRunnerSurface' })
  async function toggleFullscreen() {
    surface.vm.$emit('update:fullscreen', true)
    await flushPromises()
    surface.vm.$emit('update:fullscreen', false)
    await flushPromises()
  }
  return {
    project,
    runtime,
    surface,
    run,
    stop,
    toggleFullscreen,
    diagnosticWorkspace,
    revealDiagnostics,
    getAttachedUI,
    confirm
  }
}

describe('Simple Mode diagnostics before execution', () => {
  it('reveals diagnostics immediately and checks the code after queued edits finish', async () => {
    const { project, surface, run, diagnosticWorkspace, revealDiagnostics } = mountPreview(true)
    let finishEdit!: () => void
    const edit = project.mutex.runExclusive(async () => {
      await new Promise<void>((resolve) => (finishEdit = resolve))
      project.stage.setCode('step')
    })
    await flushPromises()
    diagnosticWorkspace.mockImplementation(async () => {
      expect(project.stage.code).toBe('step')
      return { items: [] }
    })
    const starting = surface.props('onRun')()
    expect(revealDiagnostics).toHaveBeenCalledTimes(1)
    await flushPromises()
    expect(diagnosticWorkspace).not.toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
    finishEdit()
    await edit
    await starting
    expect(diagnosticWorkspace).toHaveBeenCalledTimes(1)
    expect(revealDiagnostics.mock.invocationCallOrder[0]).toBeLessThan(diagnosticWorkspace.mock.invocationCallOrder[0])
    expect(run).toHaveBeenCalledTimes(1)
  })

  it.each(['onRun', 'onRerun'])('keeps diagnostics revealed when the user declines %s', async (handler) => {
    const { surface, run, diagnosticWorkspace, revealDiagnostics, confirm } = mountPreview(true)
    diagnosticWorkspace.mockResolvedValue({
      items: [
        {
          textDocument: { uri: 'file:///main.spx' },
          diagnostics: [
            {
              range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } },
              severity: DiagnosticSeverity.Error,
              message: 'not enough arguments in call to step'
            }
          ]
        }
      ]
    })
    confirm.mockRejectedValue(new Cancelled('declined'))
    await expect(surface.props(handler)()).rejects.toThrow(Cancelled)
    expect(revealDiagnostics).toHaveBeenCalledTimes(1)
    expect(diagnosticWorkspace).toHaveBeenCalledTimes(1)
    expect(revealDiagnostics.mock.invocationCallOrder[0]).toBeLessThan(diagnosticWorkspace.mock.invocationCallOrder[0])
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(run).not.toHaveBeenCalled()
  })

  it('checks current code again before a Simple Mode rerun', async () => {
    const { surface, run, diagnosticWorkspace, revealDiagnostics } = mountPreview(true)
    await surface.props('onRun')()
    await surface.props('onRerun')()
    expect(revealDiagnostics).toHaveBeenCalledTimes(2)
    expect(diagnosticWorkspace).toHaveBeenCalledTimes(2)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('preserves Normal Mode checks without invoking the new UI hook or checking reruns', async () => {
    const { project, surface, diagnosticWorkspace, getAttachedUI, revealDiagnostics } = mountPreview()
    const drain = vi.spyOn(project.mutex, 'runExclusive')
    await surface.props('onRun')()
    expect(diagnosticWorkspace).toHaveBeenCalledTimes(1)
    await surface.props('onRerun')()
    expect(diagnosticWorkspace).toHaveBeenCalledTimes(1)
    expect(getAttachedUI).not.toHaveBeenCalled()
    expect(revealDiagnostics).not.toHaveBeenCalled()
    expect(drain).not.toHaveBeenCalled()
  })
})

describe('Editor Preview execution lifecycle', () => {
  it('emits starts only for successful runs and reruns, after updating runtime state', async () => {
    const { runtime, surface, run, toggleFullscreen } = mountPreview()
    const started = vi.fn(() => {
      expect(runtime.running).toEqual({ mode: 'debug', initializing: false })
      expect(runtime.filesHash).toBe('files-hash')
    })
    runtime.on('didStart', started)
    let finishStartup!: (hash: string) => void
    run.mockImplementationOnce(() => new Promise<string>((resolve) => (finishStartup = resolve)))
    const starting = surface.props('onRun')()
    await flushPromises()
    expect(runtime.running).toEqual({ mode: 'debug', initializing: true })
    expect(started).not.toHaveBeenCalled()
    finishStartup('files-hash')
    await starting
    expect(started).toHaveBeenCalledTimes(1)
    await toggleFullscreen()
    surface.vm.$emit('exit', 0)
    expect(started).toHaveBeenCalledTimes(1)
    await surface.props('onRerun')()
    expect(started).toHaveBeenCalledTimes(2)
    await surface.props('onStop')()
    await surface.props('onRun')()
    expect(started).toHaveBeenCalledTimes(3)
  })

  it('does not emit a start for cancelled initialization', async () => {
    const { runtime, surface, run } = mountPreview()
    const started = vi.fn()
    runtime.on('didStart', started)
    run.mockRejectedValueOnce(new Cancelled('stop'))
    await expect(surface.props('onRun')()).rejects.toThrow(Cancelled)
    expect(started).not.toHaveBeenCalled()
  })

  it('keeps the runtime preview open after startup failure until stopped', async () => {
    const { runtime, surface, run } = mountPreview()
    const started = vi.fn()
    runtime.on('didStart', started)
    const error = new Error('startup failed')
    run.mockRejectedValueOnce(error)
    await expect(surface.props('onRun')()).rejects.toThrow(error)
    expect(runtime.running).toEqual({ mode: 'debug', initializing: false, initializingError: error })
    expect(runtime.filesHash).toBeNull()
    expect(started).not.toHaveBeenCalled()
    await surface.props('onStop')()
    expect(runtime.running).toEqual({ mode: 'none' })
  })

  it('keeps the runtime preview open after exit, fullscreen transitions, and rerun until stopped', async () => {
    const { runtime, surface, run, stop, toggleFullscreen } = mountPreview()
    run.mockImplementationOnce(async () => {
      surface.vm.$emit('exit', 0)
      return 'files-hash'
    })
    await surface.props('onRun')()
    expect(runtime.running).toEqual({ mode: 'debug', initializing: false })
    await toggleFullscreen()
    expect(runtime.running).toEqual({ mode: 'debug', initializing: false })
    stop.mockImplementationOnce(async () => surface.vm.$emit('exit', 0))
    await surface.props('onRerun')()
    expect(runtime.running).toEqual({ mode: 'debug', initializing: false })
    surface.vm.$emit('exit', 1)
    expect(runtime.running).toEqual({ mode: 'debug', initializing: false })
    await toggleFullscreen()
    expect(runtime.running).toEqual({ mode: 'debug', initializing: false })
    await surface.props('onStop')()
    expect(runtime.running).toEqual({ mode: 'none' })
  })
})
