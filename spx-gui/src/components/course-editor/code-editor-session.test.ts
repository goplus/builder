import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { createI18n } from '@/utils/i18n'
import { createReadinessScope, ReadinessProvider } from '@/utils/readiness'
import { fromConfig, fromText } from '@/models/common/file'
import { TutorialProject } from '@/models/tutorial/project'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { History } from '@/components/editor/history'
import {
  getTextDocumentId,
  loadMonaco,
  useCodeEditor,
  useProvideCodeEditor,
  type CodeEditor,
  type Monaco
} from '@/components/xgo-code-editor'
import type { MainMessage, WorkerMessage } from '@/components/xgo-code-editor/lsp/worker'
import { useCourseCodeEditor } from './code-editor'

vi.mock('@/components/xgo-code-editor/monaco', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadMonaco: vi.fn()
}))

async function createProject() {
  const project = new TutorialProject()
  await project.loadFiles({
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '',
      copilotContext: ''
    }),
    [mainCourseFilePath]: fromText(mainCourseFilePath, 'onStart => {}')
  })
  return project
}

describe('Course Code Editor session', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('retains the authoring workspace across views and preview, then disposes it with the Course Editor', async () => {
    const project = await createProject()
    const history = new History(project)
    const modelDispose = vi.fn()
    const monaco = {
      editor: {
        createModel: vi.fn((text: string) => ({
          getValue: () => text,
          setValue: (value: string) => {
            text = value
          },
          onDidChangeContent: () => ({ dispose() {} }),
          dispose: modelDispose
        }))
      }
    } as unknown as Monaco
    vi.mocked(loadMonaco).mockRejectedValueOnce(new Error('Monaco load failed')).mockResolvedValue(monaco)
    const sent: MainMessage[] = []
    const terminate = vi.fn()
    class LanguageWorker extends EventTarget {
      terminate = terminate
      postMessage(message: MainMessage) {
        sent.push(message)
        if (message.type !== 'lsp' || !('id' in message.message) || message.message.method !== 'initialize') return
        const reply: WorkerMessage = {
          type: 'lsp',
          message: { jsonrpc: '2.0', id: message.message.id, result: { capabilities: {} } }
        }
        queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: reply })))
      }
    }
    vi.stubGlobal('Worker', LanguageWorker)
    const view = ref('program')
    const seen: CodeEditor[] = []
    const previewEditor = {} as CodeEditor
    const Consumer = defineComponent(() => {
      seen.push(useCodeEditor())
      return () => null
    })
    const Preview = defineComponent(() => {
      useProvideCodeEditor(() => previewEditor, { appWide: false })
      return () => h(Consumer)
    })
    let query!: ReturnType<typeof useCourseCodeEditor>
    const Host = defineComponent(() => {
      query = useCourseCodeEditor(() => project, history)
      return () =>
        query.data.value == null ? null : view.value === 'preview' ? h(Preview) : h(Consumer, { key: view.value })
    })
    const readiness = createReadinessScope()
    const wrapper = mount(
      defineComponent(() => () => h(ReadinessProvider, { scope: readiness }, { default: () => h(Host) })),
      { global: { plugins: [createI18n({ lang: 'en' })] } }
    )
    expect(readiness.ready.value).toBe(false)
    await flushPromises()
    expect(query.error.value).not.toBeNull()
    expect(query.data.value).toBeNull()
    expect(readiness.ready.value).toBe(true)
    query.refetch()
    expect(query.error.value).toBeNull()
    expect(readiness.ready.value).toBe(false)
    await flushPromises()
    expect(readiness.ready.value).toBe(true)
    const editor = query.data.value!
    const documentId = getTextDocumentId(mainCourseFilePath)
    const document = editor.getTextDocument(documentId)
    expect(seen.at(-1)).toBe(editor)

    view.value = 'metadata'
    await flushPromises()
    expect(seen.at(-1)).toBe(editor)
    view.value = 'preview'
    await flushPromises()
    expect(seen.at(-1)).toBe(previewEditor)
    project.mainCourse.setCode('onStart => { showMessage "current" }')
    await flushPromises()
    const files = sent.filter((message) => message.type === 'files')
    expect(new TextDecoder().decode(files.at(-1)!.files[mainCourseFilePath]!.content)).toContain('current')
    await vi.waitFor(() => expect(document!.getValue()).toContain('current'))
    expect(query.data.value).toBe(editor)
    expect(editor.isDisposed).toBe(false)
    expect(terminate).not.toHaveBeenCalled()

    view.value = 'program'
    await flushPromises()
    expect(seen.at(-1)).toBe(editor)
    expect(editor.getTextDocument(documentId)).toBe(document)
    wrapper.unmount()
    expect(editor.isDisposed).toBe(true)
    expect(terminate).toHaveBeenCalledOnce()
    expect(modelDispose).toHaveBeenCalledOnce()
    project.dispose()
  })

  it('does not create a language server when loading finishes after the Course Editor has left', async () => {
    const project = await createProject()
    let finishLoading!: (monaco: Monaco) => void
    vi.mocked(loadMonaco).mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve
      })
    )
    const worker = vi.fn()
    vi.stubGlobal('Worker', worker)
    let query!: ReturnType<typeof useCourseCodeEditor>
    const wrapper = mount(
      defineComponent(() => {
        query = useCourseCodeEditor(() => project, new History(project))
        return () => null
      }),
      { global: { plugins: [createI18n({ lang: 'en' })] } }
    )
    wrapper.unmount()
    finishLoading({} as Monaco)
    await flushPromises()
    expect(query.data.value).toBeNull()
    expect(worker).not.toHaveBeenCalled()
    project.dispose()
  })
})
