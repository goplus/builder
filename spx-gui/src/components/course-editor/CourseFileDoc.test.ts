import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { createI18n } from '@/utils/i18n'
import { fromText, toText, type File } from '@/models/common/file'
import type { TutorialProject } from '@/models/tutorial/project'
import type { FileNode } from './course-tree'
import CourseFileDoc from './CourseFileDoc.vue'

// `useMessageHandle` needs the app's message provider; the delete action is not under test here.
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: (...args: unknown[]) => unknown) => ({
    fn: async (...args: unknown[]) => {
      await fn(...args)
    },
    isLoading: { value: false }
  })
}))

// Stands in for the Monaco-backed editor: it only shows the text it is given and can emit edits.
const TextDocStub = defineComponent({
  name: 'CourseTextDoc',
  props: { text: { type: String, required: true }, language: { type: String, required: true } },
  emits: ['update:text'],
  setup(props) {
    return () => h('div', { 'data-test': 'text-doc' }, props.text)
  }
})

function textNode(file: File): FileNode {
  return { type: 'file', path: 'notes.md', name: 'notes.md', file, kind: 'text', known: false }
}

function mountDoc(node: FileNode) {
  let written: File | null = null
  const project = {
    setExtraFile: vi.fn((_path: string, file: File) => {
      written = file
    }),
    removeExtraFile: vi.fn()
  } as unknown as TutorialProject
  const wrapper = mount(CourseFileDoc, {
    props: { project, node },
    global: {
      plugins: [createI18n({ lang: 'en' })],
      directives: { radar: {} },
      stubs: { CourseTextDoc: TextDocStub, UIButton: true, UITag: true }
    }
  })
  return { wrapper, project, lastWritten: () => written }
}

describe('CourseFileDoc', () => {
  it('reloads the text when the record is replaced from outside at the same path', async () => {
    const { wrapper } = mountDoc(textNode(fromText('notes.md', 'OLD')))
    await flushPromises()
    expect(wrapper.get('[data-test="text-doc"]').text()).toBe('OLD')

    // An upload replacing the record: same path (so the document is not remounted), a new `File`.
    await wrapper.setProps({ node: textNode(fromText('notes.md', 'NEW UPLOAD')) })
    await flushPromises()

    expect(wrapper.get('[data-test="text-doc"]').text()).toBe('NEW UPLOAD')
  })

  it('writes the uploaded text back, not the old one, on the next edit', async () => {
    const { wrapper, lastWritten } = mountDoc(textNode(fromText('notes.md', 'OLD')))
    await flushPromises()
    await wrapper.setProps({ node: textNode(fromText('notes.md', 'NEW UPLOAD')) })
    await flushPromises()

    const editor = wrapper.findComponent(TextDocStub)
    editor.vm.$emit('update:text', editor.props('text') + '!')
    await flushPromises()

    expect(await toText(lastWritten()!)).toBe('NEW UPLOAD!')
  })

  it('keeps the editor as it is when its own edit comes back through the model', async () => {
    const { wrapper, lastWritten } = mountDoc(textNode(fromText('notes.md', 'OLD')))
    await flushPromises()
    const editor = wrapper.findComponent(TextDocStub)

    editor.vm.$emit('update:text', 'OLD edited')
    await flushPromises()
    // The parent re-derives the node from the model, which now holds the file this document wrote.
    await wrapper.setProps({ node: textNode(lastWritten()!) })
    await flushPromises()

    // Same editor instance (not reset and remounted), still showing the author's text.
    expect(wrapper.findComponent(TextDocStub).vm).toBe(editor.vm)
    expect(wrapper.get('[data-test="text-doc"]').text()).toBe('OLD edited')
  })
})
