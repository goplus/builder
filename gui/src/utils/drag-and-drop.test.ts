import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useDragSortable } from './drag-and-drop'

const mocks = vi.hoisted(() => ({
  create: vi.fn((el: HTMLElement) => ({ el, destroy: vi.fn() }))
}))

vi.mock('sortablejs', () => ({ default: { create: mocks.create } }))

describe('useDragSortable', () => {
  it('makes a wrapper rendered again sortable, while the list stays the same', async () => {
    mocks.create.mockClear()
    const shown = ref(true)
    const wrapper = mount(
      defineComponent(() => {
        const list = ref([1, 2, 3])
        const listRef = ref<HTMLElement>()
        useDragSortable(list, listRef, { onSorted: () => {} })
        return () =>
          shown.value
            ? h(
                'ul',
                { ref: listRef },
                list.value.map((i) => h('li', { key: i }, String(i)))
              )
            : null
      })
    )
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledTimes(1)
    const first = mocks.create.mock.results[0].value

    shown.value = false
    await flushPromises()
    shown.value = true
    await flushPromises()
    expect(first.destroy).toHaveBeenCalled()
    expect(mocks.create).toHaveBeenCalledTimes(2)
    expect(mocks.create.mock.calls[1][0]).toBe(wrapper.find('ul').element)
    wrapper.unmount()
  })

  it('makes a wrapper sortable that is rendered after the list is ready', async () => {
    mocks.create.mockClear()
    const shown = ref(false)
    const wrapper = mount(
      defineComponent(() => {
        const list = ref([1, 2, 3])
        const listRef = ref<HTMLElement>()
        useDragSortable(list, listRef, { onSorted: () => {} })
        return () =>
          shown.value
            ? h(
                'ul',
                { ref: listRef },
                list.value.map((i) => h('li', { key: i }))
              )
            : null
      })
    )
    await flushPromises()
    expect(mocks.create).not.toHaveBeenCalled()

    shown.value = true
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create.mock.calls[0][0]).toBe(wrapper.find('ul').element)
    wrapper.unmount()
  })
})
