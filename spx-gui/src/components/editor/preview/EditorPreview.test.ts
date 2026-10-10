import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpxProject } from '@/models/spx/project'
import { Runtime } from '../runtime'
import EditorPreview from './EditorPreview.vue'

const { useEditorCtx } = vi.hoisted(() => ({ useEditorCtx: vi.fn() }))
vi.mock('../EditorContextProvider.vue', () => ({ useEditorCtx }))
vi.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (msg: { en: string }) => msg.en }) }))
vi.mock('@/stores/user', async () => {
  const { ref } = await import('vue')
  return { useSignedInUser: () => ref(null) }
})
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
  useConfirmDialog: () => vi.fn()
}))
vi.mock('@/components/project', () => ({ usePublishProject: () => vi.fn() }))
vi.mock('../spx-code-editor', () => ({
  useCodeEditor: () => ({ diagnosticWorkspace: async () => ({ items: [] }) }),
  DiagnosticSeverity: { Error: 1 },
  textDocumentId2CodeFileName: vi.fn(),
  getInvalidMonitors: async () => []
}))
vi.mock('./stage-viewer/StageViewer.vue', () => ({ default: { template: '<div />' } }))

const disposers: Array<() => void> = []
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()))

function mountPreview() {
  const project = new SpxProject()
  const runtime = new Runtime(project)
  useEditorCtx.mockReturnValue({ project, state: { runtime } })
  const run = vi.fn(async () => 'files-hash')
  const stop = vi.fn(async () => {})
  const wrapper = shallowMount(EditorPreview, {
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
  return { runtime, surface, run, stop, toggleFullscreen }
}

describe('Editor Preview execution lifecycle', () => {
  it('keeps startup failure state when entering and leaving fullscreen before any successful run', async () => {
    const { runtime, surface, run, toggleFullscreen } = mountPreview()
    const error = new Error('startup failed')
    run.mockRejectedValueOnce(error)
    await expect(surface.props('onRun')()).rejects.toThrow(error)
    const running = runtime.running
    expect(running).toEqual({ mode: 'debug', initializing: false, initializingError: error })
    expect(runtime.filesHash).toBeNull()
    await toggleFullscreen()
    expect(runtime.running).toBe(running)
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
