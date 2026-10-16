// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as lsp from 'vscode-languageserver-protocol'
import { startWorker } from '@/components/xgo-code-editor/lsp/test'
import { tutorialClassFrameworkConfig } from './class-framework'

describe('Tutorial language server Worker', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('analyzes and edits the current Tutorial program with the author SDK', async () => {
    const source = 'var title = "hello"\nonStart => { showMessage title }\n'
    const textDocument = { uri: 'file:///main_course.gox' }
    const { request, setFiles } = await startWorker({ 'main_course.gox': source }, tutorialClassFrameworkConfig)
    const diagnostics = () => request<lsp.WorkspaceDiagnosticReport>('workspace/diagnostic', { previousResultIds: [] })
    expect((await diagnostics()).items).toContainEqual(expect.objectContaining({ ...textDocument, items: [] }))
    const hover = await request<lsp.Hover>('textDocument/hover', { textDocument, position: { line: 1, character: 16 } })
    expect(JSON.stringify(hover.contents)).toContain('showMessage')
    const completion = await request<lsp.CompletionList | lsp.CompletionItem[]>('textDocument/completion', {
      textDocument,
      position: { line: 1, character: 14 }
    })
    const items = Array.isArray(completion) ? completion : completion.items
    expect(items).toContainEqual(expect.objectContaining({ label: 'showMessage' }))
    const rename = await request<lsp.WorkspaceEdit>('textDocument/rename', {
      textDocument,
      position: { line: 0, character: 5 },
      newName: 'greeting'
    })
    expect(rename.changes?.[textDocument.uri]).toHaveLength(2)
    const format = await request<lsp.TextEdit[]>('textDocument/formatting', {
      textDocument,
      options: { tabSize: 4, insertSpaces: false }
    })
    expect(format.length).toBeGreaterThan(0)
    setFiles({ 'main_course.gox': 'onStart => { unknownCall }\n' })
    expect(JSON.stringify(await diagnostics())).toContain('unknownCall')
    setFiles({ 'main_course.gox': source })
    expect((await diagnostics()).items).toContainEqual(expect.objectContaining({ ...textDocument, items: [] }))
  })
})
