import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { CompletionController } from '.'
import CompletionUI from './CompletionUI.vue'

vi.mock('../CodeEditorUI.vue', () => ({ useCodeEditorUICtx: () => ({ ui: { editor: {} } }) }))
vi.mock('../common', () => ({ toAbsolutePosition: () => ({ left: 0, top: 0, height: 10 }) }))

describe('CompletionUI', () => {
  it('clears an existing completion on unmount', () => {
    const completion = ref<{ position: { line: number; column: number } } | null>({ position: { line: 1, column: 1 } })
    const controller = {
      nonEmptyItems: [],
      get completion() {
        return completion.value
      },
      stopCompletion: () => {
        completion.value = null
      }
    } as unknown as CompletionController
    const wrapper = shallowMount(CompletionUI, { props: { controller } })
    wrapper.unmount()
    expect(controller.completion).toBeNull()
  })
})
