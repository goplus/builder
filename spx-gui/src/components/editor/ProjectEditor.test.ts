import { shallowMount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpxProject } from '@/models/spx/project'
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
  const state = reactive({
    selectedEditMode: mode,
    selected: { type: 'sprite', sprite: { codeFilePath: 'Cat.spx' } },
    codeReadOnly: false
  })
  useEditorCtx.mockReturnValue({ project, state })
  const wrapper = shallowMount(ProjectEditor, { global: { directives: { radar: {} }, renderStubDefaultSlot: true } })
  disposers.push(() => wrapper.unmount())
  return { wrapper, state }
}

describe('Simple Mode code editing', () => {
  it('passes the shared read-only state to the editor without replacing it', async () => {
    const { wrapper, state } = mountEditor()
    const editor = () => wrapper.getComponent({ name: 'CodeEditorUI' })
    const instance = editor().vm
    expect(editor().props('readOnly')).toBe(false)
    state.codeReadOnly = true
    await nextTick()
    expect(editor().props('readOnly')).toBe(true)
    state.codeReadOnly = false
    await nextTick()
    expect(editor().props('readOnly')).toBe(false)
    expect(editor().vm).toBe(instance)
    expect(wrapper.findComponent({ name: 'EditorPreview' }).exists()).toBe(true)
  })

  it('uses the shared state when re-entering Simple Mode and leaves standard mode unchanged', async () => {
    const { wrapper, state } = mountEditor('default')
    state.codeReadOnly = true
    await nextTick()
    expect(wrapper.findComponent({ name: 'SpriteEditor' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CodeEditorUI' }).exists()).toBe(false)
    state.selectedEditMode = 'simple'
    await nextTick()
    expect(wrapper.getComponent({ name: 'CodeEditorUI' }).props('readOnly')).toBe(true)
    state.selectedEditMode = 'default'
    state.codeReadOnly = false
    state.selectedEditMode = 'simple'
    await nextTick()
    expect(wrapper.getComponent({ name: 'CodeEditorUI' }).props('readOnly')).toBe(false)
  })
})
