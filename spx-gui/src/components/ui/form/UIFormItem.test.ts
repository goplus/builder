import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useForm } from './ctrl'
import UIForm from './UIForm.vue'
import UIFormItem from './UIFormItem.vue'
import UINumberInput from '../input/UINumberInput.vue'
import { useFieldControlBindings } from './field-control-bindings'

const PassiveControl = defineComponent({
  name: 'PassiveControl',
  props: {
    value: {
      type: String,
      default: ''
    }
  },
  emits: ['update:value'],
  setup(props) {
    const { controlBindings } = useFieldControlBindings()
    return () => h('input', { ...controlBindings.value, value: props.value })
  }
})

const ChangeControl = defineComponent({
  name: 'ChangeControl',
  props: {
    value: {
      type: String,
      default: ''
    }
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    const { controlBindings, onChange } = useFieldControlBindings()
    return () =>
      h(
        'button',
        {
          ...controlBindings.value,
          type: 'button',
          onClick: () => {
            emit('update:value', props.value === 'next' ? 'other' : 'next')
            onChange()
          }
        },
        'toggle'
      )
  }
})

function createHarness(validateName: ReturnType<typeof vi.fn>, options?: { changeControl?: boolean }) {
  return defineComponent({
    name: 'FormHarness',
    components: {
      UIForm,
      UIFormItem,
      PassiveControl,
      ChangeControl
    },
    setup() {
      const form = useForm({
        name: ['', validateName as (value: string) => string | null]
      })
      return { form }
    },
    template: `
      <UIForm :form="form">
        <UIFormItem path="name">
          <ChangeControl v-if="${options?.changeControl === true}" v-model:value="form.value.name" />
          <PassiveControl v-else v-model:value="form.value.name" />
        </UIFormItem>
      </UIForm>
    `
  })
}

function createNumberHarness(validateCount: ReturnType<typeof vi.fn>, options?: { initialValue?: number | null }) {
  return defineComponent({
    name: 'NumberFormHarness',
    components: {
      UIForm,
      UIFormItem,
      UINumberInput
    },
    setup() {
      const form = useForm({
        count: [options?.initialValue ?? null, validateCount as (value: number | null) => string | null]
      })
      return { form }
    },
    template: `
      <UIForm :form="form">
        <UIFormItem path="count">
          <UINumberInput v-model:value="form.value.count" />
        </UIFormItem>
      </UIForm>
    `
  })
}

describe('UIFormItem external value sync', () => {
  it('revalidates an already-validated field when its value changes externally', async () => {
    const validateName = vi.fn((value: string) => (value === '' ? 'Required' : null))
    const wrapper = mount(createHarness(validateName))
    const form = (wrapper.vm as any).form

    await form.validateWithPath('name')
    expect(validateName).toHaveBeenCalledTimes(1)

    form.value.name = 'ok'
    await nextTick()

    expect(validateName).toHaveBeenCalledTimes(2)
    expect(form.validated.name).toEqual({ hasError: false })
  })

  it('does not validate untouched fields when their value changes externally', async () => {
    const validateName = vi.fn((value: string) => (value === '' ? 'Required' : null))
    const wrapper = mount(createHarness(validateName))
    const form = (wrapper.vm as any).form

    form.value.name = 'ok'
    await nextTick()

    expect(validateName).not.toHaveBeenCalled()
    expect(form.validated.name).toBeUndefined()
  })

  it('does not double-validate local change-driven updates', async () => {
    const validateName = vi.fn((value: string) => (value === '' ? 'Required' : null))
    const wrapper = mount(createHarness(validateName, { changeControl: true }))
    const form = (wrapper.vm as any).form

    await form.validateWithPath('name')
    expect(validateName).toHaveBeenCalledTimes(1)

    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(validateName).toHaveBeenCalledTimes(2)
    expect(form.value.name).toBe('next')
    expect(form.validated.name).toEqual({ hasError: false })
  })
})

describe('UIFormItem with UINumberInput', () => {
  it('does not validate work-in-progress decimal input during typing', async () => {
    vi.useFakeTimers()
    try {
      const validateCount = vi.fn((value: number | null) => (value == null ? 'Required' : null))
      const wrapper = mount(createNumberHarness(validateCount))

      const input = wrapper.get('input')
      await input.trigger('focus')
      await input.setValue('1.')

      await vi.advanceTimersByTimeAsync(400)
      await nextTick()

      expect(validateCount).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('validates committed number input after the debounced input path runs', async () => {
    vi.useFakeTimers()
    try {
      const validateCount = vi.fn((value: number | null) => (value == null ? 'Required' : null))
      const wrapper = mount(createNumberHarness(validateCount))

      const input = wrapper.get('input')
      await input.trigger('focus')
      await input.setValue('1')

      await vi.advanceTimersByTimeAsync(400)
      await nextTick()

      expect(validateCount).toHaveBeenCalledTimes(1)
      expect(validateCount).toHaveBeenLastCalledWith(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('treats keyboard stepping as an input-like validation trigger', async () => {
    vi.useFakeTimers()
    try {
      const validateCount = vi.fn((value: number | null) => (value == null ? 'Required' : null))
      const wrapper = mount(createNumberHarness(validateCount))

      await wrapper.get('input').trigger('keydown', { key: 'ArrowUp' })
      await vi.advanceTimersByTimeAsync(400)
      await nextTick()

      expect(validateCount).toHaveBeenCalledTimes(1)
      expect(validateCount).toHaveBeenLastCalledWith(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
