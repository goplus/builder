import { describe, expect, it, vi } from 'vitest'
import { DiagnosticSeverity, type ILSPClient, type ITextDocument, type IXGoProject } from '@/components/xgo-code-editor'
import { RuntimeOutputKind, type Runtime } from '../runtime'
import { SpxDiagnosticsProvider } from './diagnostics'

vi.mock('@/models/common/hash', () => ({ hashFiles: async () => 'current-files' }))

describe('SPX diagnostic origins', () => {
  it('keeps runtime failures separate from static errors for presentation deferral', async () => {
    const id = { uri: 'file:///Lita.spx' }
    const runtime = {
      on: () => () => {},
      filesHash: 'current-files',
      outputSnapshot: [
        {
          kind: RuntimeOutputKind.Error,
          message: 'runtime failure',
          source: { textDocument: id, range: { start: { line: 1, column: 2 }, end: { line: 1, column: 3 } } }
        }
      ]
    } as unknown as Runtime
    const files = {}
    const project = { exportFiles: () => files } as IXGoProject
    const lspClient = {
      workspaceDiagnostic: async () => ({
        items: [
          {
            uri: id.uri,
            kind: 'full',
            items: [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } },
                severity: 1,
                message: 'missing step argument'
              }
            ]
          }
        ]
      })
    } as unknown as ILSPClient
    const textDocument = { id, getLineContent: () => 'step' } as unknown as ITextDocument
    const provider = new SpxDiagnosticsProvider(runtime, lspClient, project)
    try {
      const diagnostics = await provider.provideDiagnostics({ textDocument, signal: new AbortController().signal })
      expect(diagnostics).toEqual([
        {
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } },
          severity: DiagnosticSeverity.Error,
          message: 'runtime failure',
          origin: 'runtime'
        },
        {
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } },
          severity: DiagnosticSeverity.Error,
          message: 'missing step argument',
          origin: 'static',
          sourceRange: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } }
        }
      ])
    } finally {
      provider.dispose()
    }
  })
})
