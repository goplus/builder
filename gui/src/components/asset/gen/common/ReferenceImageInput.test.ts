import { flushPromises, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { mockFile } from '@/models/common/test'
import { Costume } from '@/models/spx/costume'
import type { ReferenceImageSelection } from '@/models/spx/gen/reference-image'
import ReferenceImageInput from './ReferenceImageInput.vue'

let selectFile: (file: ReturnType<typeof mockFile>) => Promise<void>

vi.mock('@/utils/file', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/file')>()),
  useFileUrl: () => [ref('local-url')]
}))

vi.mock('./useReferenceImageUpload', () => ({
  useReferenceImageUpload: (onSelected: typeof selectFile) => {
    selectFile = onSelected
    return () => undefined
  }
}))

function mountInput(selection: ReferenceImageSelection = null) {
  return shallowMount(ReferenceImageInput, {
    props: { selection, costumes: [] },
    global: {
      mocks: { $t: (message: { zh: string }) => message.zh },
      directives: { radar: () => undefined }
    }
  })
}

describe('ReferenceImageInput', () => {
  it('keeps an unused local image only while the input stays mounted', async () => {
    const wrapper = mountInput()
    await flushPromises()
    const file = mockFile('reference.png')
    await selectFile(file)
    expect(wrapper.emitted('update:selection')).toEqual([[{ type: 'local-image', file }]])
    await wrapper.setProps({ selection: { type: 'local-image', file } })
    await wrapper.setProps({ selection: { type: 'costume', costumeId: 'costume' } })

    const selector = wrapper.getComponent({ name: 'ParamSelector' })
    const localOption = selector.props('options').find((option: { removable?: boolean }) => option.removable)
    expect(localOption).toBeDefined()
    selector.vm.$emit('update:value', localOption.value)
    expect(wrapper.emitted('update:selection')?.at(-1)).toEqual([{ type: 'local-image', file }])

    wrapper.unmount()
    const remounted = mountInput({ type: 'costume', costumeId: 'costume' })
    await flushPromises()
    expect(remounted.getComponent({ name: 'ParamSelector' }).props('options')).toEqual([])
    remounted.unmount()
  })

  it('can remove the temporary image without changing a costume selection', async () => {
    const wrapper = mountInput({ type: 'costume', costumeId: 'costume' })
    await flushPromises()
    await selectFile(mockFile('reference.png'))
    await wrapper.vm.$nextTick()
    const selector = wrapper.getComponent({ name: 'ParamSelector' })
    const localOption = selector.props('options').find((option: { removable?: boolean }) => option.removable)
    const updates = wrapper.emitted('update:selection')?.length
    selector.vm.$emit('remove:option', localOption.value)
    await wrapper.vm.$nextTick()
    expect(selector.props('options')).toEqual([])
    expect(wrapper.emitted('update:selection')).toHaveLength(updates!)
    wrapper.unmount()
  })

  it.each([true, false])(
    'uses the supplied fallback when removing a selected image (fallback=%s)',
    async (hasFallback) => {
      const file = mockFile('reference.png')
      const wrapper = mountInput({ type: 'local-image', file })
      const firstCostume = new Costume('first', mockFile('first.png'))
      const defaultCostume = new Costume('default', mockFile('default.png'))
      await wrapper.setProps({
        costumes: [firstCostume, defaultCostume],
        fallbackCostumeId: hasFallback ? defaultCostume.id : null,
        clearable: false
      })
      await flushPromises()
      const selector = wrapper.getComponent({ name: 'ParamSelector' })
      const localOption = selector.props('options').find((option: { removable?: boolean }) => option.removable)
      selector.vm.$emit('remove:option', localOption.value)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:selection')).toEqual([
        [hasFallback ? { type: 'costume', costumeId: defaultCostume.id } : null]
      ])
      expect(selector.props('options')).toHaveLength(2)
      wrapper.unmount()
    }
  )

  it('allows clearing the selection without deleting the temporary image', async () => {
    const file = mockFile('reference.png')
    const wrapper = mountInput({ type: 'local-image', file })
    await wrapper.setProps({ fallbackCostumeId: 'default' })
    await flushPromises()
    const selector = wrapper.getComponent({ name: 'ParamSelector' })
    selector.vm.$emit('update:value', null)

    expect(wrapper.emitted('update:selection')).toEqual([[null]])
    expect(selector.props('options')).toHaveLength(1)
    wrapper.unmount()
  })

  it('does not replace the reference when upload validation fails', async () => {
    const wrapper = mountInput({ type: 'costume', costumeId: 'costume' })
    const error = new Error('reference image is too small')
    const validate = vi.fn().mockRejectedValue(error)
    await wrapper.setProps({ validate })
    const file = mockFile('small.png')

    await expect(selectFile(file)).rejects.toBe(error)
    expect(validate).toHaveBeenCalledWith(file)
    expect(wrapper.emitted('update:selection')).toBeUndefined()
    expect(wrapper.getComponent({ name: 'ParamSelector' }).props('options')).toEqual([])
    wrapper.unmount()
  })
})
