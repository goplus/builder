// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as lsp from 'vscode-languageserver-protocol'
import { startWorker } from '@/components/xgo-code-editor/lsp/test'
import type { xgoGetInputSlots, xgoGetProperties } from '@/components/xgo-code-editor/lsp/spxls/commands'
import { spxClassFramework } from './class-framework'

const startSpxWorker = (sources: Record<string, string>) => startWorker(sources, spxClassFramework)

describe('SPX language server Worker', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('analyzes stage and sprite code with the SDK, engine, math, and AI packages', async () => {
    const { request, command } = await startSpxWorker({
      'main.spx': `import engine "github.com/goplus/spx/v3/pkg/spx/pkg/engine"
var (
    score int
    list List
    bot ai.Player
)
println abs(-1), engine.TimeSinceGameStarted()
bot.setRole "helper"
`,
      'Cat.spx': 'var health int\nprintln score\n',
      'assets/index.json': '{}',
      'assets/sprites/Cat/index.json': '{}'
    })
    const diagnostics = await request<lsp.WorkspaceDiagnosticReport>('workspace/diagnostic', { previousResultIds: [] })
    expect(diagnostics.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ uri: 'file:///main.spx', kind: 'full', items: [] }),
        expect.objectContaining({ uri: 'file:///Cat.spx', kind: 'full', items: [] })
      ])
    )
    const stage = await command<xgoGetProperties.Result>('xgo.getProperties', { target: 'Game' })
    expect(stage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'score', type: 'int', kind: 'field' }),
        expect.objectContaining({ name: 'list', type: 'List', kind: 'field' })
      ])
    )
    const sprite = await command<xgoGetProperties.Result>('xgo.getProperties', { target: 'Cat' })
    expect(sprite).toContainEqual(
      expect.objectContaining({
        name: 'xpos',
        definition: { package: 'github.com/goplus/spx/v3', name: 'Sprite.xpos' }
      })
    )
    const completion = await request<lsp.CompletionList | lsp.CompletionItem[]>('textDocument/completion', {
      textDocument: { uri: 'file:///main.spx' },
      position: { line: 7, character: 4 }
    })
    const items = Array.isArray(completion) ? completion : completion.items
    expect(items).toContainEqual(expect.objectContaining({ label: 'setRole' }))
  })

  it('resolves and renames resources and keeps analysis stable after formatting', async () => {
    const sources = {
      'main.spx': 'play "beep"\n',
      'Cat.spx': 'setCostume "idle/front"\nturn 90\n',
      'assets/index.json': '{}',
      'assets/sounds/beep/index.json': '{}',
      'assets/sounds/taken/index.json': '{}',
      'assets/sprites/Cat/index.json': '{"costumes":[{"name":"idle/front"}]}'
    }
    const { request, command, setFiles } = await startSpxWorker(sources)
    const textDocument = { uri: 'file:///Cat.spx' }
    const links = await request<lsp.DocumentLink[]>('textDocument/documentLink', { textDocument })
    expect(links).toContainEqual(
      expect.objectContaining({ target: 'spx://resources/sprites/Cat/costumes/idle%2Ffront' })
    )
    const slots = await command<xgoGetInputSlots.Result>('xgo.getInputSlots', { textDocument })
    expect(slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accept: { type: 'spx-resource-name', resourceContext: 'spx://resources/sprites/Cat/costumes' }
        }),
        expect.objectContaining({ accept: { type: 'spx-direction' } })
      ])
    )
    const resource = { uri: 'spx://resources/sounds/beep' }
    const edit = await command<lsp.WorkspaceEdit>('xgo.renameResources', { resource, newName: 'chime' })
    expect(edit.changes?.['file:///main.spx']).toEqual([
      { range: { start: { line: 0, character: 6 }, end: { line: 0, character: 10 } }, newText: 'chime' }
    ])
    await expect(command('xgo.renameResources', { resource, newName: 'taken' })).rejects.toThrow('already exists')
    await request('textDocument/formatting', { textDocument, options: { tabSize: 4, insertSpaces: false } })
    expect(await request('textDocument/documentLink', { textDocument })).toEqual(links)
    setFiles({ ...sources, 'assets/sprites/Cat/index.json': '{}' })
    const updated = await request<lsp.DocumentLink[]>('textDocument/documentLink', { textDocument })
    expect(updated).not.toContainEqual(
      expect.objectContaining({ target: 'spx://resources/sprites/Cat/costumes/idle%2Ffront' })
    )
  })

  it('refreshes provider files and notifies all monitor targets affected by a property rename', async () => {
    const sources = {
      'main.spx': 'var score int\n',
      'Cat.spx': 'println score\n',
      'assets/index.json': '{}',
      'assets/sprites/Cat/index.json': '{}'
    }
    const { request, command, setFiles, propertyRenames } = await startSpxWorker(sources)
    await command('xgo.getProperties', { target: 'Game' })
    setFiles({ ...sources, 'main.spx': 'var score string\n' })
    const updated = await command<xgoGetProperties.Result>('xgo.getProperties', { target: 'Game' })
    expect(updated).toContainEqual(expect.objectContaining({ name: 'score', type: 'string' }))
    const edit = await request<lsp.WorkspaceEdit>('textDocument/rename', {
      textDocument: { uri: 'file:///main.spx' },
      position: { line: 0, character: 5 },
      newName: 'points'
    })
    expect(Object.keys(edit.changes ?? {}).sort()).toEqual(['file:///Cat.spx', 'file:///main.spx'])
    expect(propertyRenames).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: 'Game', oldName: 'score', newName: 'points' }),
        expect.objectContaining({ target: 'Cat', oldName: 'score', newName: 'points' })
      ])
    )
    setFiles({ 'main.spx': 'var points string\n', 'assets/index.json': '{}' })
    await expect(command('xgo.getProperties', { target: 'Cat' })).rejects.toThrow('not found')
  })
})
