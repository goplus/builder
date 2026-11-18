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
  it('displays a bound value that is hidden and disabled in the dropdown', async () => {
    const harness = defineComponent({
      components: { UISelect },
      props: { unlisted: Boolean },
      template: `
        <UISelect value="existing" placeholder="Choose a value">
          <option v-if="unlisted" value="existing" hidden disabled>Existing value</option>
          <option v-else value="existing">Existing value</option>
          <option value="other">Other</option>
        </UISelect>
      `
    })
    const wrapper = mount(harness)

    await vi.waitFor(() => expect(wrapper.get('span').text()).toBe('Existing value'))
    await wrapper.setProps({ unlisted: true })
    const select = wrapper.get('select')
    await vi.waitFor(() => expect(wrapper.get('span').text()).toBe('Existing value'))
    expect(select.element.value).toBe('existing')
    expect(select.get('option[value="existing"]').attributes()).toMatchObject({ disabled: '', hidden: '' })
    await select.setValue('other')
    expect(wrapper.getComponent(UISelect).emitted('update:value')).toEqual([['other']])
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
