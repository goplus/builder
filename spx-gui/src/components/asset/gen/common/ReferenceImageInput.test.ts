import { flushPromises, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { mockFile } from '@/models/common/test'
import ReferenceImageInput from './ReferenceImageInput.vue'

let selectFile: (file: ReturnType<typeof mockFile>) => void

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

function mountInput(selection: { type: 'costume'; costumeId: string } | null = null) {
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
    selectFile(file)
    expect(wrapper.emitted('update:referenceImage')).toEqual([[file]])
    await wrapper.setProps({ selection: { type: 'local-image', file } })
    await wrapper.setProps({ selection: { type: 'costume', costumeId: 'costume' } })

    const selector = wrapper.getComponent({ name: 'ParamSelector' })
    const localOption = selector.props('options').find((option: { removable?: boolean }) => option.removable)
    expect(localOption).toBeDefined()
    selector.vm.$emit('update:value', localOption.value)
    expect(wrapper.emitted('update:selection')).toEqual([[{ type: 'local-image', file }]])

    wrapper.unmount()
    const remounted = mountInput({ type: 'costume', costumeId: 'costume' })
    await flushPromises()
    expect(remounted.getComponent({ name: 'ParamSelector' }).props('options')).toEqual([])
  })

  it('can remove the temporary image without changing a costume selection', async () => {
    const wrapper = mountInput({ type: 'costume', costumeId: 'costume' })
    await flushPromises()
    selectFile(mockFile('reference.png'))
    await wrapper.vm.$nextTick()
    const selector = wrapper.getComponent({ name: 'ParamSelector' })
    const localOption = selector.props('options').find((option: { removable?: boolean }) => option.removable)
    selector.vm.$emit('remove:option', localOption.value)
    await wrapper.vm.$nextTick()
    expect(selector.props('options')).toEqual([])
    expect(wrapper.emitted('update:referenceImage')?.at(-1)).toEqual([null])
    expect(wrapper.emitted('update:selection')).toBeUndefined()
  })
})
