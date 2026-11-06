// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as lsp from 'vscode-languageserver-protocol'
import type { xgoGetProperties } from './spxls/commands'
import { startWorker } from './test'

describe('XGo language server Worker', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('analyzes ordinary XGo without a class framework registration', async () => {
    const { request, command, setFiles } = await startWorker({
      'main.xgo': 'type Counter struct { Value int }\nvar title = "hello"\nprintln title\n'
    })
    const diagnostics = () => request<lsp.WorkspaceDiagnosticReport>('workspace/diagnostic', { previousResultIds: [] })
    expect((await diagnostics()).items).toContainEqual(expect.objectContaining({ uri: 'file:///main.xgo', items: [] }))
    const hover = await request<lsp.Hover>('textDocument/hover', {
      textDocument: { uri: 'file:///main.xgo' },
      position: { line: 2, character: 9 }
    })
    expect(JSON.stringify(hover.contents)).toContain('string')
    expect(await command<xgoGetProperties.Result>('xgo.getProperties', { target: 'Counter' })).toContainEqual(
      expect.objectContaining({ name: 'Value', type: 'int', kind: 'field' })
    )
    setFiles({ 'main.xgo': 'println unknownValue\n' })
    expect(JSON.stringify(await diagnostics())).toContain('unknownValue')
  })
})
