import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { File } from '@/models/common/file'
import ReferenceImageButton from './ReferenceImageButton.vue'
import { settingsInputCtxKey } from './SettingsInput.vue'

vi.mock('@/utils/file', () => ({
  useFileUrl: () => [ref('reference-url'), ref(false)]
}))

vi.mock('./useReferenceImageUpload', () => ({
  useReferenceImageUpload: () => () => undefined
}))

const DropdownStub = defineComponent({
  setup(_, { slots }) {
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
  UIButton: false,
  ImageOption: false,
  UIDropdownWithTooltip: DropdownStub,
  UITooltip: TooltipStub,
  UICornerIcon: CornerIconStub,
  UIImg: true
}

const settingsInputCtx = reactive({ disabled: false, readonly: false, iconOnly: false })
const global = {
  provide: { [settingsInputCtxKey as symbol]: settingsInputCtx },
  stubs,
  renderStubDefaultSlot: true,
  mocks: { $t: (message: string | { zh: string }) => (typeof message === 'string' ? message : message.zh) },
  directives: {
    radar: {
      mounted: (element: HTMLElement, binding: { value: { name: string } }) => {
        element.setAttribute('aria-label', binding.value.name)
      }
    }
  }
}

describe('ReferenceImageButton', () => {
  beforeEach(() => {
    settingsInputCtx.disabled = false
    settingsInputCtx.readonly = false
    settingsInputCtx.iconOnly = false
  })

  it('shows an upload action before selecting an image', () => {
    const wrapper = shallowMount(ReferenceImageButton, {
      props: { file: null },
      global
    })

    expect(wrapper.get('button').attributes('aria-label')).toBe('Upload reference image')
    expect(wrapper.get('[data-test-id="tooltip"]').text()).toBe('上传参考图片')
  })

  it('uses the settings context for readonly and compact display', () => {
    settingsInputCtx.readonly = true
    settingsInputCtx.iconOnly = true
    const wrapper = shallowMount(ReferenceImageButton, { props: { file: null }, global })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').text()).toBe('')
  })

  it('removes the reference image popover and focuses the upload button', async ({ onTestFinished }) => {
    const wrapper = shallowMount(ReferenceImageButton, {
      attachTo: document.body,
      props: {
        file: { name: 'reference.png' } as File,
        'onUpdate:file': (file: File | null) => {
          wrapper.setProps({ file })
        }
      },
      global
    })
    onTestFinished(() => wrapper.unmount())

    const toolbar = wrapper.get('[data-test-id="toolbar"]')
    expect(toolbar.text()).not.toContain('reference.png')
    expect(toolbar.find('[data-test-id="remove"]').exists()).toBe(false)
    expect(wrapper.get('[data-test-id="tooltip"]').text()).toBe('参考图片')
    expect(wrapper.get('[data-test-id="popover"]').text()).toContain('reference.png')
    expect(wrapper.get('[data-test-id="popover"]').text()).toContain('参考图片')
    expect(wrapper.get('[data-test-id="remove"]').attributes('type')).toBe('trash')

    const removeButton = wrapper.get<HTMLButtonElement>('[data-test-id="remove"]')
    removeButton.element.focus()
    await removeButton.trigger('click')

    expect(wrapper.emitted('update:file')).toEqual([[null]])
    expect(wrapper.find('[data-test-id="popover"]').exists()).toBe(false)
    expect(wrapper.get('button').attributes('aria-label')).toBe('Upload reference image')
    expect(document.activeElement).toBe(wrapper.get('button').element)
  })
})
