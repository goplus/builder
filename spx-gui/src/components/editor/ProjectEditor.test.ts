import { shallowMount } from '@vue/test-utils'
import { markRaw, nextTick, reactive } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpxProject } from '@/models/spx/project'
import { Runtime } from './runtime'
import ProjectEditor from './ProjectEditor.vue'

const { useEditorCtx } = vi.hoisted(() => ({ useEditorCtx: vi.fn() }))
vi.mock('./EditorContextProvider.vue', () => ({ useEditorCtx }))
vi.mock('./copilot', () => ({ useSpxEditorCopilot: vi.fn() }))
vi.mock('./spx-code-editor', () => ({
  CodeEditorUI: { name: 'CodeEditorUI', props: ['codeFilePath', 'simpleMode', 'readOnly'], template: '<div />' }
}))
vi.mock('./sprite/SpriteEditor.vue', () => ({ default: { name: 'SpriteEditor', template: '<div />' } }))
vi.mock('./stage/StageEditor.vue', () => ({ default: { name: 'StageEditor', template: '<div />' } }))
vi.mock('./preview/EditorPreview.vue', () => ({ default: { name: 'EditorPreview', template: '<div />' } }))
vi.mock('./panels/EditorPanels.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./map-editor/MapEditor.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/copilot/DockedCopilotUI.vue', () => ({ default: { template: '<div />' } }))

const disposers: Array<() => void> = []
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()))

function mountEditor(mode = 'simple') {
  const project = new SpxProject()
  const runtime = new Runtime(project)
  const state = reactive({
    selectedEditMode: mode,
    selected: { type: 'sprite', sprite: { codeFilePath: 'Cat.spx' } },
    runtime: markRaw(runtime)
  })
  useEditorCtx.mockReturnValue({ project, state })
  const wrapper = shallowMount(ProjectEditor, { global: { directives: { radar: {} }, renderStubDefaultSlot: true } })
  disposers.push(
    () => wrapper.unmount(),
    () => runtime.dispose()
  )
  return { wrapper, runtime, state }
}

describe('Simple Mode code editing', () => {
  it('restores editing after stop, completion, and startup failure across repeated runs', async () => {
    const { wrapper, runtime } = mountEditor()
    const editor = () => wrapper.getComponent({ name: 'CodeEditorUI' })
    expect(editor().props('readOnly')).toBe(false)
    for (const ending of ['stop', 'completion', 'failure']) {
      runtime.setRunning({ mode: 'debug', initializing: true })
      await nextTick()
      expect(editor().props('readOnly')).toBe(true)
      const instance = editor().vm
      runtime.setRunning({ mode: 'debug', initializing: false }, 'files-hash')
      await nextTick()
      expect(editor().props('readOnly')).toBe(true)
      if (ending === 'stop') runtime.setRunning({ mode: 'none' })
      if (ending === 'completion') runtime.setRunning({ mode: 'debug', initializing: false, exited: true })
      if (ending === 'failure') {
        runtime.setRunning({ mode: 'debug', initializing: false, initializingError: new Error('failed') })
      }
      await nextTick()
      expect(editor().props('readOnly')).toBe(false)
      expect(editor().vm).toBe(instance)
      expect(wrapper.findComponent({ name: 'EditorPreview' }).exists()).toBe(true)
    }
  })

  it('uses the current runtime when re-entering Simple Mode and leaves standard mode unchanged', async () => {
    const { wrapper, runtime, state } = mountEditor('default')
    runtime.setRunning({ mode: 'debug', initializing: false }, 'files-hash')
    await nextTick()
    expect(wrapper.findComponent({ name: 'SpriteEditor' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CodeEditorUI' }).exists()).toBe(false)
    state.selectedEditMode = 'simple'
    await nextTick()
    expect(wrapper.getComponent({ name: 'CodeEditorUI' }).props('readOnly')).toBe(true)
    state.selectedEditMode = 'default'
    runtime.setRunning({ mode: 'none' })
    state.selectedEditMode = 'simple'
    await nextTick()
    expect(wrapper.getComponent({ name: 'CodeEditorUI' }).props('readOnly')).toBe(false)
  })
})
