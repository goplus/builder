import { flushPromises } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import type { CodeEditorUIController } from '../code-editor-ui'
import { APIReferenceController, type APIReferenceItem } from '.'

function deferredItems() {
  let resolve!: (items: APIReferenceItem[]) => void
  const promise = new Promise<APIReferenceItem[]>((done) => (resolve = done))
  return { promise, resolve }
}

function makeHarness() {
  const provideAPIReference = vi.fn().mockResolvedValue([])
  const ui = reactive({
    activeTextDocument: {},
    codeEditor: { apiReferenceProvider: { provideAPIReference } }
  })
  const controller = new APIReferenceController(ui as unknown as CodeEditorUIController)
  controller.init()
  return { ui, controller }
}

describe('API Reference readiness', () => {
  it('retains displayed data while reporting a pending provider update', async () => {
    const { ui, controller } = makeHarness()
    try {
      await flushPromises()
      expect(controller.loading).toBe(false)
      expect(controller.items).toEqual([])
      const updated = deferredItems()
      ui.codeEditor.apiReferenceProvider = { provideAPIReference: vi.fn(() => updated.promise) }
      await nextTick()
      expect(controller.loading).toBe(true)
      expect(controller.items).toEqual([])
      updated.resolve([])
      await updated.promise
      await flushPromises()
      expect(controller.loading).toBe(false)
    } finally {
      controller.dispose()
    }
  })

  it('keeps readiness pending when an obsolete request finishes', async () => {
    const { ui, controller } = makeHarness()
    try {
      await nextTick()
      const obsolete = deferredItems()
      ui.codeEditor.apiReferenceProvider = { provideAPIReference: vi.fn(() => obsolete.promise) }
      await nextTick()
      const current = deferredItems()
      ui.codeEditor.apiReferenceProvider = { provideAPIReference: vi.fn(() => current.promise) }
      await nextTick()
      obsolete.resolve([])
      await obsolete.promise
      await nextTick()
      expect(controller.loading).toBe(true)
      current.resolve([])
      await current.promise
      await flushPromises()
      expect(controller.loading).toBe(false)
    } finally {
      controller.dispose()
    }
  })
})
