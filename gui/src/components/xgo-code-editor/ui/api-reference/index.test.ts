import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { shallowReactive, nextTick } from 'vue'
import type { CodeEditorUIController } from '../code-editor-ui'
import { APIReferenceController, type APIReferenceItem } from '.'

vi.mock('@/utils/exception', async (importOriginal) => ({ ...(await importOriginal<object>()), capture: vi.fn() }))

describe('API Reference loading', () => {
  it('tracks loading independently of preserved empty results and settles errors', async () => {
    const ui = shallowReactive({
      activeTextDocument: {},
      codeEditor: shallowReactive({
        apiReferenceProvider: { provideAPIReference: async (): Promise<APIReferenceItem[]> => [] }
      })
    })
    const controller = new APIReferenceController(ui as unknown as CodeEditorUIController)
    controller.init()
    await flushPromises()
    expect(controller.items).toEqual([])
    expect(controller.loading).toBe(false)
    let finish!: (items: APIReferenceItem[]) => void
    ui.codeEditor.apiReferenceProvider = {
      provideAPIReference: () => new Promise((resolve) => (finish = resolve))
    }
    await nextTick()
    expect(controller.items).toEqual([])
    expect(controller.loading).toBe(true)
    finish([{} as APIReferenceItem])
    await flushPromises()
    expect(controller.items).toHaveLength(1)
    expect(controller.loading).toBe(false)
    const error = new Error('API load failed')
    ui.codeEditor.apiReferenceProvider = {
      provideAPIReference: async () => {
        throw error
      }
    }
    await flushPromises()
    expect(controller.error).toBe(error)
    expect(controller.loading).toBe(false)
    controller.dispose()
  })
})
