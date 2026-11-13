import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { settingsInputCtxKey } from '../SettingsInput.vue'
import ParamSelector from './ParamSelector.vue'

vi.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    t: (message: { zh: string }) => message.zh
  })
}))

const DropdownStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', [slots.trigger?.(), slots['dropdown-content']?.()])
  }
})

const CornerIconStub = defineComponent({
  props: {
    type: { type: String, required: true }
  },
  setup(props) {
    return () => h('button', { 'data-test-id': 'corner-icon', 'data-type': props.type })
  }
})

function mountSelector(clearable = true) {
  const costume = { id: 'costume' }
  const localImage = { id: 'local-image' }
  const wrapper = shallowMount(ParamSelector, {
    props: {
      name: { en: 'Reference image', zh: '参考图片' },
      tips: { en: 'Select a reference', zh: '选择参考' },
      value: costume,
      clearable,
      options: [
        { value: costume, label: { en: 'Costume', zh: '造型' } },
        { value: localImage, label: { en: 'Local image', zh: '本地图片' }, removable: true }
      ]
    },
    global: {
      provide: {
        [settingsInputCtxKey as symbol]: { disabled: false, readonly: false, iconOnly: false }
      },
      stubs: {
        UIDropdownWithTooltip: DropdownStub,
        ImageOption: false,
        UIBlockItem: false,
        UICornerIcon: CornerIconStub,
        UIImg: true
      },
      renderStubDefaultSlot: true,
      mocks: {
        $t: (message: { zh: string }) => message.zh
      },
      directives: { radar: () => undefined }
    }
  })
  return { wrapper, costume, localImage }
}

describe('ParamSelector', () => {
  it('shows the corner action only for the selected option', async () => {
    const { wrapper, localImage } = mountSelector()
    const getCornerIcons = () => wrapper.findAll('[data-test-id="corner-icon"]')
    expect(getCornerIcons()).toHaveLength(1)
    expect(getCornerIcons()[0].attributes('data-type')).toBe('minus')

    await wrapper.setProps({ value: localImage })
    expect(getCornerIcons()).toHaveLength(1)
    expect(getCornerIcons()[0].attributes('data-type')).toBe('trash')
    await wrapper.setProps({ value: null })
    expect(getCornerIcons()).toHaveLength(0)
  })

  it.each([true, false])('removes local images without changing selection when clearable=%s', async (clearable) => {
    const { wrapper, localImage } = mountSelector(clearable)
    await wrapper.setProps({ value: localImage })
    await wrapper.get('[data-test-id="corner-icon"]').trigger('click')
    expect(wrapper.emitted('remove:option')).toEqual([[localImage]])
    expect(wrapper.emitted('update:value')).toBeUndefined()
  })

  it('deselects a costume without deleting it or bubbling to the card', async () => {
    const { wrapper } = mountSelector()
    await wrapper.get('[data-test-id="corner-icon"]').trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[null]])
    expect(wrapper.emitted('remove:option')).toBeUndefined()
  })

  it('keeps a required costume selected and allows selecting the local image', async () => {
    const { wrapper, costume, localImage } = mountSelector(false)
    expect(wrapper.find('[data-test-id="corner-icon"]').exists()).toBe(false)
    const cards = wrapper.findAll('.ui-block-item')
    await cards[0].trigger('click')
    await cards[1].trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[costume], [localImage]])
    expect(wrapper.emitted('remove:option')).toBeUndefined()
  })
})
