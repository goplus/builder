import { describe, expect, it } from 'vitest'
import type { EditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { RuntimeOutputKind, type RuntimeOutput } from '@/components/editor/runtime'
import { DiagnosticSeverity, type CodeEditor } from '@/components/editor/spx-code-editor'
import { captureFeedbackContext } from './context'

function makeEditorCtx(outputs: RuntimeOutput[] = [], { saved = true } = {}) {
  return {
    project: {
      owner: saved ? 'alice' : null,
      name: saved ? 'space' : null,
      displayName: 'Space'
    },
    state: {
      runtime: { outputs }
    }
  } as unknown as EditorCtx
}

function makeCodeEditor(diagnosticWorkspace: () => Promise<unknown>) {
  return {
    diagnosticWorkspace
  } as unknown as CodeEditor
}

describe('captureFeedbackContext', () => {
  it('captures only page information outside of the editor', async () => {
    const context = await captureFeedbackContext({
      source: 'profileMenu',
      path: '/explore?tab=hot',
      language: 'zh',
      editorCtx: null,
      codeEditor: null,
      maxSize: Infinity
    })
    expect(context).toEqual({
      source: 'profileMenu',
      page: { path: '/explore?tab=hot', language: 'zh' }
    })
  })

  it('captures editor state with limits applied', async () => {
    const outputs = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      kind: RuntimeOutputKind.Log,
      time: Date.UTC(2026, 0, 1, 0, 0, i),
      message: `log ${i}`
    }))
    outputs.push({
      id: 60,
      kind: RuntimeOutputKind.Error,
      time: Date.UTC(2026, 0, 1, 0, 1),
      message: 'x'.repeat(600),
      source: {
        textDocument: { uri: 'file:///Rocket.spx' },
        range: { start: { line: 7, column: 1 }, end: { line: 7, column: 2 } }
      }
    } as RuntimeOutput)
    const codeEditor = makeCodeEditor(async () => ({
      items: [
        {
          textDocument: { uri: 'file:///Rocket.spx' },
          diagnostics: [
            {
              range: { start: { line: 3, column: 1 }, end: { line: 3, column: 4 } },
              severity: DiagnosticSeverity.Error,
              message: 'undefined: foo'
            }
          ]
        }
      ]
    }))

    const context = await captureFeedbackContext({
      source: 'profileMenu',
      path: '/editor/alice/space',
      language: 'en',
      editorCtx: makeEditorCtx(outputs),
      codeEditor,
      maxSize: Infinity
    })

    expect(context.project).toEqual({
      identifier: 'alice/space',
      displayName: 'Space'
    })
    expect(context.diagnostics).toEqual([
      { file: 'Rocket.spx', severity: DiagnosticSeverity.Error, line: 3, message: 'undefined: foo' }
    ])
    expect(context.runtimeOutputs).toHaveLength(50)
    expect(context.runtimeOutputs?.[0]).toEqual({
      time: '2026-01-01T00:00:11.000Z',
      kind: RuntimeOutputKind.Log,
      file: null,
      line: null,
      message: 'log 11'
    })
    expect(context.runtimeOutputs?.[49]).toEqual({
      time: '2026-01-01T00:01:00.000Z',
      kind: RuntimeOutputKind.Error,
      file: 'Rocket.spx',
      line: 7,
      message: 'x'.repeat(500)
    })
  })

  it('captures a null identifier for unsaved projects', async () => {
    const context = await captureFeedbackContext({
      source: 'profileMenu',
      path: '/editor',
      language: 'en',
      editorCtx: makeEditorCtx([], { saved: false }),
      codeEditor: null,
      maxSize: Infinity
    })

    expect(context.project).toEqual({ identifier: null, displayName: 'Space' })
  })

  it('omits diagnostics when they are unavailable', async () => {
    const codeEditor = makeCodeEditor(() => Promise.reject(new Error('language server not ready')))

    const context = await captureFeedbackContext({
      source: 'profileMenu',
      path: '/editor/alice/space',
      language: 'en',
      editorCtx: makeEditorCtx(),
      codeEditor,
      maxSize: Infinity
    })

    expect(context.diagnostics).toBeUndefined()
    expect(context.runtimeOutputs).toBeUndefined()
  })

  it('drops the largest items when Context exceeds the size limit', async () => {
    const outputs = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      kind: RuntimeOutputKind.Log,
      time: Date.UTC(2026, 0, 1, 0, 0, i),
      message: 'x'.repeat(100)
    }))
    const codeEditor = makeCodeEditor(async () => ({ items: [] }))

    const context = await captureFeedbackContext({
      source: 'profileMenu',
      path: '/editor/alice/space',
      language: 'en',
      editorCtx: makeEditorCtx(outputs),
      codeEditor,
      maxSize: 512
    })

    expect(context.runtimeOutputs).toBeUndefined()
    expect(context.project).toBeDefined()
    expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(512)
  })

  it('removes NUL characters from captured text', async () => {
    const outputs = [{ id: 0, kind: RuntimeOutputKind.Log, time: Date.UTC(2026, 0, 1), message: 'a\0b' }]
    const codeEditor = makeCodeEditor(async () => ({
      items: [
        {
          textDocument: { uri: 'file:///Rocket.spx' },
          diagnostics: [
            {
              range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
              severity: DiagnosticSeverity.Error,
              message: 'c\0d'
            }
          ]
        }
      ]
    }))

    const context = await captureFeedbackContext({
      source: 'profileMenu',
      path: '/editor/alice/space',
      language: 'en',
      editorCtx: makeEditorCtx(outputs),
      codeEditor,
      maxSize: Infinity
    })

    expect(context.diagnostics?.[0].message).toBe('cd')
    expect(context.runtimeOutputs?.[0].message).toBe('ab')
  })
})
