import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Monaco } from '../monaco'
import MonacoEditor from './MonacoEditor.vue'

vi.mock('@/utils/utils', async (original) => ({
  ...(await original<typeof import('@/utils/utils')>()),
  untilTaskScheduled: async () => {}
}))
enableAutoUnmount(afterEach)
const editor = { layout: vi.fn(), dispose: vi.fn(), updateOptions: vi.fn() }
const create = vi.fn(() => editor)
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('reactive Monaco options', () => {
  it('applies restored preferences without recreating the editor', async () => {
    const wrapper = mount(MonacoEditor, {
      props: { monaco: { editor: { create } } as unknown as Monaco, options: { fontSize: 18 } }
    })
    await flushPromises()
    expect(create).toHaveBeenCalledOnce()
    await wrapper.setProps({ options: { fontSize: 16 } })
    expect(editor.updateOptions).toHaveBeenLastCalledWith({ fontSize: 16 })
    expect(create).toHaveBeenCalledOnce()
    wrapper.unmount()
    expect(editor.dispose).toHaveBeenCalledOnce()
  })
})
