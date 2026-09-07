import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { File } from '@/models/common/file'
import ReferenceImageButton from './ReferenceImageButton.vue'

vi.mock('@/utils/file', () => ({
  useFileUrl: () => [{ value: 'reference-url' }, { value: false }]
}))

vi.mock('../common/useReferenceImageUpload', () => ({
  useReferenceImageUpload: () => () => undefined
}))

const setDropdownVisible = vi.fn()

const DropdownStub = defineComponent({
  setup(_, { expose, slots }) {
    expose({ setVisible: setDropdownVisible })
    return () =>
      h('div', [
        h('div', { 'data-test-id': 'toolbar' }, slots.trigger?.()),
        h('div', { 'data-test-id': 'popover' }, slots['dropdown-content']?.()),
        h('div', { 'data-test-id': 'tooltip' }, slots['tooltip-content']?.())
      ])
  }
})

const TooltipStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', [slots.trigger?.(), h('div', { 'data-test-id': 'tooltip' }, slots.default?.())])
  }
})

const CornerIconStub = defineComponent({
  emits: ['click'],
  setup(_, { emit }) {
    return () => h('button', { 'data-test-id': 'remove', onClick: (event) => emit('click', event) })
  }
})

const stubs = {
  UIDropdownWithTooltip: DropdownStub,
  UITooltip: TooltipStub,
  UICornerIcon: CornerIconStub,
  UIImg: true
}

const global = {
  stubs,
  renderStubDefaultSlot: true,
  mocks: { $t: (message: string | { zh: string }) => (typeof message === 'string' ? message : message.zh) },
  directives: { radar: () => undefined }
}

describe('ReferenceImageButton', () => {
  beforeEach(() => {
    setDropdownVisible.mockClear()
  })

  it('shows an upload action before selecting an image', () => {
    const wrapper = shallowMount(ReferenceImageButton, {
      props: { file: null },
      global
    })

    expect(wrapper.get('u-i-button-stub').attributes('icon')).toBe('upload')
    expect(wrapper.get('[data-test-id="tooltip"]').text()).toBe('上传参考图片')
  })

  it('keeps the file name out of the toolbar and removes it from the popover', async () => {
    const wrapper = shallowMount(ReferenceImageButton, {
      props: { file: { name: 'reference.png' } as File },
      global
    })

    const toolbar = wrapper.get('[data-test-id="toolbar"]')
    expect(toolbar.text()).not.toContain('reference.png')
    expect(toolbar.find('[data-test-id="remove"]').exists()).toBe(false)
    expect(wrapper.get('[data-test-id="tooltip"]').text()).toBe('reference.png')
    expect(wrapper.get('[data-test-id="popover"]').text()).toContain('reference.png')

    await wrapper.get('[data-test-id="remove"]').trigger('click')

    expect(setDropdownVisible).toHaveBeenCalledWith(false)
    expect(wrapper.emitted('update:file')).toEqual([[null]])

    await wrapper.setProps({ file: null })
    expect(wrapper.find('[data-test-id="popover"]').exists()).toBe(false)
    expect(wrapper.get('u-i-button-stub').attributes('icon')).toBe('upload')
  })
})
