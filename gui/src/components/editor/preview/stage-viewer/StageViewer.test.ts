import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { SpxProject } from '@/models/spx/project'
import StageViewer from './StageViewer.vue'

const { useEditorCtx } = vi.hoisted(() => ({ useEditorCtx: vi.fn() }))
vi.mock('@/components/editor/EditorContextProvider.vue', () => ({ useEditorCtx }))
vi.mock('@/components/editor/spx-code-editor', () => ({ useCodeEditor: () => ({}) }))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMessageHandle: (fn: unknown) => ({ fn })
}))
vi.mock('@/utils/dom', () => ({ useContentSize: () => shallowRef({ width: 480, height: 360 }) }))

describe('Stage Viewer thumbnail capture', () => {
  it.each([true, false])('captures a rendered stage in simpleMode=%s', async (simpleMode) => {
    const project = new SpxProject()
    let capture!: (name: string, signal?: AbortSignal) => Promise<unknown>
    vi.spyOn(project, 'bindScreenshotTaker').mockImplementation((taker) => {
      capture = taker
      return () => {}
    })
    useEditorCtx.mockReturnValue({ project, state: { selectedSprite: null, selectedWidget: null } })
    const toBlob = vi.fn(async () => new Blob(['image'], { type: 'image/jpeg' }))
    const withHidden = vi.fn(async (fn: () => Promise<Blob>) => fn())
    const wrapper = shallowMount(StageViewer, {
      props: { simpleMode },
      global: {
        directives: { radar: {} },
        stubs: {
          'v-rect': true,
          'v-group': true,
          'v-stage': { template: '<div><slot /></div>', methods: { getStage: () => ({ toBlob }) } },
          'v-layer': { template: '<div><slot /></div>' },
          NodeTransformer: { template: '<div />', methods: { withHidden } }
        }
      }
    })
    await flushPromises()
    const signal = AbortSignal.timeout(500)
    try {
      expect(await capture('thumbnail', signal)).toBeDefined()
      expect(toBlob).toHaveBeenCalledOnce()
      expect(withHidden).toHaveBeenCalledTimes(simpleMode ? 0 : 1)
    } finally {
      wrapper.unmount()
      project.dispose()
    }
  })
})
