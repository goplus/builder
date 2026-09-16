import { defineComponent, h, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { TextDocument } from '../text-document'
import type { MonacoEditor } from '../monaco'
import ReferenceSelectionModal from './ReferenceSelectionModal.vue'
import type { ReferenceSelection } from './code-editor-ui'

function makeSelection(): ReferenceSelection {
  const textDocument = {
    id: { uri: 'file:///Cube.spx' },
    displayName: { en: 'Cube', zh: 'Cube' },
    monacoTextModel: { uri: 'file:///Cube.spx' }
  } as unknown as TextDocument
  return {
    source: {
      textDocument,
      position: { line: 6, column: 6 },
      viewState: null
    },
    references: [
      {
        textDocument,
        range: {
          start: { line: 27, column: 3 },
          end: { line: 27, column: 12 }
        },
        code: 'setRowCol(inits.row, inits.col, false)'
      },
      {
        textDocument,
        range: {
          start: { line: 31, column: 3 },
          end: { line: 31, column: 12 }
        },
        code: 'setRowCol(row, col, false)'
      }
    ]
  }
}

describe('ReferenceSelectionModal', () => {
  it('creates a fresh preview editor when reopened', async () => {
    const previewEditors: Array<
      MonacoEditor & {
        disposed: boolean
      }
    > = []
    const MonacoEditorStub = defineComponent({
      emits: ['init'],
      setup(_, { emit }) {
        const editor = {
          disposed: false,
          setModel: vi.fn(function (this: { disposed: boolean }) {
            if (this.disposed) throw new Error('Preview editor has been disposed')
          }),
          setSelection: vi.fn(),
          revealRangeNearTopIfOutsideViewport: vi.fn()
        } as unknown as MonacoEditor & { disposed: boolean }
        previewEditors.push(editor)
        onMounted(() => emit('init', editor))
        onBeforeUnmount(() => {
          editor.disposed = true
        })
        return () => h('div')
      }
    })
    const UIModalStub = defineComponent({
      props: { visible: Boolean },
      setup(props, { slots }) {
        return () => (props.visible ? h('div', slots.default?.()) : null)
      }
    })
    const selection = makeSelection()
    const wrapper = mount(ReferenceSelectionModal, {
      props: {
        monaco: {} as any,
        options: {},
        selection
      },
      global: {
        mocks: {
          $t: (message: { en: string } | string) => (typeof message === 'string' ? message : message.en)
        },
        stubs: {
          UIModal: UIModalStub,
          UIModalClose: true,
          MonacoEditorComp: MonacoEditorStub
        }
      }
    })
    await nextTick()

    expect(previewEditors).toHaveLength(1)
    expect(previewEditors[0].setModel).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ selection: null })
    await nextTick()
    expect(previewEditors[0].disposed).toBe(true)

    const reopenedSelection = makeSelection()
    await wrapper.setProps({ selection: reopenedSelection })
    await nextTick()

    expect(previewEditors).toHaveLength(2)
    expect(previewEditors[0].setModel).toHaveBeenCalledTimes(1)
    expect(previewEditors[1].setModel).toHaveBeenCalledTimes(1)

    const openButton = wrapper.findAll('button').find((button) => button.text() === 'Open')
    expect(openButton).toBeDefined()
    await openButton!.trigger('click')
    expect(wrapper.emitted('open')?.at(-1)).toEqual([reopenedSelection.references[0]])
  })
})
