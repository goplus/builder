import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { type InputHelperController, type InternalInputSlot } from '.'
import InputHelperUI from './InputHelperUI.vue'

vi.mock('../CodeEditorUI.vue', () => ({
  useCodeEditorUICtx: () => ({
    ui: {
      editor: {
        render: vi.fn(),
        getDomNode: () => {
          const el = document.createElement('div')
          el.innerHTML = '<span class="code-editor-input-helper-inputing-bg"></span>'
          return el
        }
      }
    }
  })
}))
vi.mock('../common', () => ({ useDecorations: vi.fn() }))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMessageHandle: (fn: () => void) => ({ fn })
}))

describe('Input Helper UI lifecycle', () => {
  it('requests editor focus after submitting input', async () => {
    const inputingSlot = ref<InternalInputSlot | null>({ id: 'slot' } as InternalInputSlot)
    const stopInputing = vi.fn(() => (inputingSlot.value = null))
    const controller = {
      get inputingSlot() {
        return inputingSlot.value
      },
      stopInputing
    } as unknown as InputHelperController
    const wrapper = shallowMount(InputHelperUI, {
      props: { controller },
      global: { renderStubDefaultSlot: true }
    })
    await nextTick()
    wrapper.getComponent({ name: 'InputHelper' }).vm.$emit('submit')
    expect(controller.inputingSlot).toBeNull()
    expect(stopInputing).toHaveBeenCalledWith(true)
    wrapper.unmount()
  })

  it('clears the input slot on unmount so it does not reopen after a run', async () => {
    const inputingSlot = ref<InternalInputSlot | null>(null)
    const stopInputing = vi.fn(() => (inputingSlot.value = null))
    const controller = {
      get inputingSlot() {
        return inputingSlot.value
      },
      stopInputing
    } as unknown as InputHelperController
    const wrapper = shallowMount(InputHelperUI, { props: { controller } })
    inputingSlot.value = { id: 'slot' } as InternalInputSlot
    wrapper.unmount()
    expect(stopInputing).toHaveBeenCalledTimes(1)
    expect(controller.inputingSlot).toBeNull()
    const remounted = shallowMount(InputHelperUI, { props: { controller } })
    expect(remounted.findComponent({ name: 'InputHelper' }).exists()).toBe(false)
    remounted.unmount()
  })
})
