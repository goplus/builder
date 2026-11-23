import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useForm } from '../form/ctrl'
import UIForm from '../form/UIForm.vue'
import UIFormItem from '../form/UIFormItem.vue'
import UISelect from './UISelect.vue'
import UISelectOption from './UISelectOption.vue'

function createFormHarness(validateTemplate: ReturnType<typeof vi.fn>) {
  return defineComponent({
    name: 'SelectFormHarness',
    components: {
      UIForm,
      UIFormItem,
      UISelect,
      UISelectOption
    },
    setup() {
      const form = useForm({
        template: ['', validateTemplate as (value: string) => string | null]
      })
      return { form }
    },
    template: `
      <UIForm :form="form" has-success-feedback>
        <UIFormItem label="Template" path="template">
          <UISelect v-model:value="form.value.template" placeholder="Select a template">
            <UISelectOption value="platformer">platformer</UISelectOption>
            <UISelectOption value="story">story</UISelectOption>
          </UISelect>
        </UIFormItem>
      </UIForm>
    `
  })
}

describe('UISelect', () => {
  it('keeps the bound value visible until its option returns', async () => {
    const harness = defineComponent({
      components: { UISelect, UISelectOption },
      props: { unlisted: Boolean },
      template: `
        <UISelect value="existing" placeholder="Choose a value">
          <UISelectOption v-if="!unlisted" value="existing">Existing value</UISelectOption>
          <option value="other">Other</option>
        </UISelect>
      `
    })
    const wrapper = mount(harness)

    await vi.waitFor(() => expect(wrapper.get('span').text()).toBe('Existing value'))
    await wrapper.setProps({ unlisted: true })
    const select = wrapper.get('select')
    await vi.waitFor(() => {
      expect(wrapper.get('span').text()).toBe('existing')
      expect(select.element.value).toBe('existing')
    })
    expect(select.get('option[value="existing"]').attributes()).toMatchObject({ disabled: '', hidden: '' })
    await select.setValue('other')
    expect(wrapper.getComponent(UISelect).emitted('update:value')).toEqual([['other']])
    await wrapper.setProps({ unlisted: false })
    await vi.waitFor(() => {
      expect(wrapper.get('span').text()).toBe('Existing value')
      expect(select.element.value).toBe('existing')
      expect(select.find('option[hidden]').exists()).toBe(false)
    })
  })

  it('displays the option label when an empty string is a valid value', async () => {
    const wrapper = mount(UISelect, {
      props: { value: '', placeholder: 'Choose a target' },
      slots: { default: '<option value="sprite">Sprite</option><option value="">Stage</option>' }
    })
    await vi.waitFor(() => expect(wrapper.get('span').text()).toBe('Stage'))
    expect(wrapper.get('select').element.value).toBe('')
    expect(wrapper.find('option[disabled]').exists()).toBe(false)
  })

  it('uses the placeholder for an empty value without a matching option', async () => {
    const wrapper = mount(UISelect, { props: { value: '', placeholder: 'Choose a value' } })
    expect(wrapper.get('span').text()).toBe('Choose a value')
    expect(wrapper.find('option[hidden]').exists()).toBe(false)
    await wrapper.setProps({ value: 'missing' })
    await vi.waitFor(() => expect(wrapper.get('select').element.value).toBe('missing'))
    expect(wrapper.get('span').text()).toBe('missing')
    await wrapper.setProps({ value: null })
    await vi.waitFor(() => expect(wrapper.get('span').text()).toBe('Choose a value'))
  })

  it('binds form accessibility attributes onto the native select element', () => {
    const validateTemplate = vi.fn(() => null)
    const wrapper = mount(createFormHarness(validateTemplate))

    const select = wrapper.get('select')
    expect(select.attributes('id')).toBeTruthy()
    expect(select.attributes('aria-labelledby')).toBeTruthy()
  })

  it('triggers form validation when the selected value changes', async () => {
    const validateTemplate = vi.fn((value: string) => (value === '' ? 'Template is required' : null))
    const wrapper = mount(createFormHarness(validateTemplate))

    await wrapper.get('select').setValue('story')
    await nextTick()

    expect(validateTemplate).toHaveBeenCalledTimes(1)
    expect(validateTemplate).toHaveBeenLastCalledWith('story')
  })

  it('triggers blur validation through the form context', async () => {
    vi.useFakeTimers()
    try {
      const validateTemplate = vi.fn((value: string) => (value === '' ? 'Template is required' : null))
      const wrapper = mount(createFormHarness(validateTemplate))

      await wrapper.get('select').trigger('blur')
      await vi.advanceTimersByTimeAsync(250)
      await nextTick()

      expect(validateTemplate).toHaveBeenCalledTimes(1)
      expect(validateTemplate).toHaveBeenLastCalledWith('')
    } finally {
      vi.useRealTimers()
    }
  })
})
