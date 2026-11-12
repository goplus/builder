import { describe, expect, it, vi } from 'vitest'
import { computed, shallowRef } from 'vue'
import { InputKind, resourceURIPrefix } from '../../common'
import type { CodeEditorUIController } from '../code-editor-ui'
import { ResourceReferenceController } from '.'

describe('Resource hover preview', () => {
  it('uses resolved resources and in-place resource inputs, and clears stale targets', async () => {
    vi.useFakeTimers()
    const move = vi.fn()
    const keyDown = vi.fn()
    const edit = vi.fn()
    const dom = document.createElement('div')
    const doc = shallowRef({})
    const range = { start: { line: 1, column: 8 }, end: { line: 1, column: 16 } }
    const pinecone = { uri: `${resourceURIPrefix}sprites/Pinecone` }
    const boat = { uri: `${resourceURIPrefix}sprites/Boat` }
    const references = shallowRef([{ range, resource: pinecone }])
    const slots = shallowRef([
      { range, input: { kind: InputKind.InPlace, type: 'spx-sprite-instance', value: boat.uri } }
    ])
    const disposable = { dispose: vi.fn() }
    const ui = {
      get activeTextDocument() {
        return doc.value
      },
      project: { exportFiles: () => ({}) },
      codeEditor: { resourceAdapter: { provideResourceReferences: async () => references.value } },
      monaco: { editor: { MouseTargetType: { CONTENT_TEXT: 1 } } },
      inputHelperController: {
        get slots() {
          return slots.value
        },
        inputingSlot: null
      },
      hoverController: { on: () => vi.fn() },
      editor: {
        getDomNode: () => dom,
        onMouseMove: (listener: unknown) => {
          move.mockImplementation(listener as () => void)
          return disposable
        },
        onKeyDown: (listener: unknown) => {
          keyDown.mockImplementation(listener as () => void)
          return disposable
        },
        onMouseDown: () => disposable,
        onDidChangeModelContent: (listener: unknown) => {
          edit.mockImplementation(listener as () => void)
          return disposable
        }
      }
    } as unknown as CodeEditorUIController
    const controller = new ResourceReferenceController(ui)
    const hover = (column = 10) =>
      move({
        target: {
          type: 1,
          detail: {},
          range: { startLineNumber: 1, startColumn: column }
        }
      })
    try {
      controller.init(true)
      await vi.runAllTimersAsync()
      hover()
      expect(controller.hoveredResource).toEqual(pinecone)
      controller.previewResource(boat)
      expect(controller.hoveredResource).toEqual(boat)
      controller.previewResource(null)
      expect(controller.hoveredResource).toEqual(pinecone)
      dom.dispatchEvent(new MouseEvent('mouseleave'))
      await vi.runAllTimersAsync()
      expect(controller.hoveredResource).toBeNull()
      hover(2)
      expect(controller.hoveredResource).toBeNull()
      hover()
      keyDown()
      expect(controller.hoveredResource).toBeNull()
      hover()
      edit()
      expect(controller.hoveredResource).toBeNull()

      references.value = []
      doc.value = {}
      await vi.runAllTimersAsync()
      hover()
      expect(controller.hoveredResource).toEqual(boat)
      const preview = computed(() => controller.hoveredResource)
      const firstPreview = preview.value
      hover()
      expect(preview.value).toBe(firstPreview)
      hover(11)
      expect(preview.value).toEqual(boat)
      slots.value = [{ range, input: { kind: InputKind.Predefined, type: 'spx-sprite-instance', value: boat.uri } }]
      expect(controller.hoveredResource).toBeNull()
      controller.previewResource(boat)
      window.dispatchEvent(new Event('blur'))
      expect(controller.hoveredResource).toBeNull()
    } finally {
      controller.dispose()
      vi.useRealTimers()
    }
  })
})
