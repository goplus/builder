import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type * as lsp from 'vscode-languageserver-protocol'
import { fromConfig, fromText, toText } from '@/models/common/file'
import { TutorialProject } from '@/models/tutorial/project'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { History } from '@/components/editor/history'
import { CodeChangeKind, CompletionProvider, DocumentBase, getTextDocumentId } from '@/components/xgo-code-editor'
import type { MainMessage, WorkerMessage } from '@/components/xgo-code-editor/lsp/worker'
import { createTutorialLSPClient, TutorialCodeEditorProject } from './code-editor'

async function setup() {
  const project = new TutorialProject()
  await project.loadFiles({
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '',
      copilotContext: ''
    }),
    [mainCourseFilePath]: fromText(mainCourseFilePath, 'onStart => {}')
  })
  const history = new History(project)
  const adapter = new TutorialCodeEditorProject(project, history)
  return { project, history, adapter }
}

describe('Tutorial code editor', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('exports current unsaved code with stable identity and participates in course undo and redo', async () => {
    const { project, history, adapter } = await setup()
    const initial = adapter.exportFiles()
    expect(adapter.exportFiles()).toBe(initial)
    const owner = adapter.getCodeOwner(mainCourseFilePath)!
    owner.setCode('onStart => { showMessage "hello" }', CodeChangeKind.User)
    await project.runExclusive(() => {})
    expect(await toText(adapter.exportFiles()[mainCourseFilePath]!)).toContain('hello')
    expect(adapter.exportFiles()).not.toBe(initial)
    await history.undo()
    expect(owner.getCode()).toBe('onStart => {}')
    await history.redo()
    expect(owner.getCode()).toContain('hello')
    project.dispose()
  })

  it('sends model files before requests and releases pending requests when the session ends', async () => {
    const { project, adapter } = await setup()
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
    const client = createTutorialLSPClient(adapter)
    client.init()
    project.mainCourse.setCode('onStart => { showMessage "current" }')
    const result = client.textDocumentHover(
      {},
      { textDocument: getTextDocumentId(mainCourseFilePath), position: { line: 0, character: 15 } }
    )
    const rejected = expect(result).rejects.toMatchObject({ reason: 'language client disposed' })
    await vi.waitFor(() =>
      expect(sent.some((m) => m.type === 'lsp' && m.message.method === 'textDocument/hover')).toBe(true)
    )
    const fileMessages = sent.filter((m) => m.type === 'files')
    expect(new TextDecoder().decode(fileMessages.at(-1)!.files[mainCourseFilePath]!.content)).toContain('current')
    project.mainCourse.setCode('onStart => {}')
    await nextTick()
    client.dispose()
    await rejected
    expect(terminate).toHaveBeenCalledOnce()
    project.dispose()
  })

  it('offers Tutorial framework completions without a separate static documentation entry', async () => {
    const { adapter } = await setup()
    const client = createTutorialLSPClient(adapter)
    vi.spyOn(client, 'getCompletionList').mockResolvedValue({
      isIncomplete: false,
      items: [
        {
          label: 'showMessage',
          data: { definition: { package: 'github.com/goplus/builder/tools/tutorial', name: 'Course.showMessage' } },
          documentation: 'Show a message'
        }
      ]
    } as lsp.CompletionList)
    const provider = new CompletionProvider(client, new DocumentBase(), adapter.classFramework, {
      includeUndocumentedFrameworkAPIs: true
    })
    const result = await provider.provideCompletion(
      {
        textDocument: { id: getTextDocumentId(mainCourseFilePath), getLineContent: () => '' } as any,
        signal: new AbortController().signal
      },
      { line: 1, column: 1 }
    )
    expect(result.items).toEqual([expect.objectContaining({ label: 'showMessage' })])
    client.dispose()
  })
})
