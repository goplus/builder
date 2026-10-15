import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref, shallowRef, watchEffect } from 'vue'
import { createAppState } from '@/utils/app-state'
import type { CodeEditor } from './code-editor'
import { useCodeEditorRef, useProvideCodeEditor } from './context'

describe('Code Editor context', () => {
  it('keeps a local Course editor independent of the app-wide SPX editor', async () => {
    const spx = { name: 'spx' } as unknown as CodeEditor
    const tutorial = { name: 'tutorial' } as unknown as CodeEditor
    const localActive = ref(true)
    const localValue = shallowRef<CodeEditor | null>(null)
    const globalValue = shallowRef<CodeEditor | null>(null)
    const LocalReader = defineComponent(() => {
      localValue.value = useCodeEditorRef().value
      return () => null
    })
    const GlobalReader = defineComponent(() => {
      const editor = useCodeEditorRef()
      watchEffect(() => {
        globalValue.value = editor.value
      })
      return () => null
    })
    const LocalProvider = defineComponent(() => {
      useProvideCodeEditor(() => tutorial, { appWide: false })
      return () => h(LocalReader)
    })
    const SpxProvider = defineComponent(() => {
      useProvideCodeEditor(() => spx)
      return () => null
    })
    const wrapper = mount(
      defineComponent(
        () => () => h('div', [h(SpxProvider), localActive.value ? h(LocalProvider) : null, h(GlobalReader)])
      ),
      { global: { plugins: [createAppState()] } }
    )
    expect(localValue.value).toBe(tutorial)
    expect(globalValue.value).toBe(spx)
    localActive.value = false
    await wrapper.vm.$nextTick()
    expect(globalValue.value).toBe(spx)
    wrapper.unmount()
  })
})
