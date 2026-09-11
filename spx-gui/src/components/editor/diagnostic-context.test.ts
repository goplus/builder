import { describe, expect, it } from 'vitest'

import type { SpxProject } from '@/models/spx/project'
import type { Sprite } from '@/models/spx/sprite'
import type { EditorCtx } from './EditorContextProvider.vue'
import { RuntimeOutputKind } from './runtime'
import { DiagnosticSeverity, type CodeEditor } from './spx-code-editor'
import {
  getActiveCodeDiagnosticContext,
  getCodeDiagnosticsDiagnosticContext,
  getProjectDiagnosticContext,
  getRuntimeOutputsDiagnosticContext,
  getSpriteDiagnosticContext,
  sampleCode
} from './diagnostic-context'

describe('editor diagnostic context', () => {
  it('extracts project and sprite state as structured data', () => {
    const project = {
      owner: 'alice',
      name: 'demo',
      type: 'game',
      displayName: 'Demo game',
      sprites: [{ name: 'Hero' }],
      sounds: [{ name: 'Jump' }],
      stage: {
        backdrops: [{ name: 'Room' }],
        widgets: [{ name: 'Score' }],
        physics: { enabled: true }
      }
    } as unknown as SpxProject
    const sprite = {
      name: 'Hero',
      costumes: [{ name: 'Idle' }],
      animations: [{ name: 'Run' }],
      heading: 90,
      x: 12,
      y: -8,
      size: 80,
      rotationStyle: 'normal',
      visible: true,
      code: 'line 1\nline 2'
    } as unknown as Sprite

    expect(getProjectDiagnosticContext(project)).toEqual({
      identifier: 'alice/demo',
      type: 'game',
      displayName: 'Demo game',
      content: {
        sprites: ['Hero'],
        sounds: ['Jump'],
        backdrops: ['Room'],
        widgets: ['Score'],
        physicsEnabled: true
      }
    })
    expect(getSpriteDiagnosticContext(sprite)).toEqual({
      name: 'Hero',
      costumes: ['Idle'],
      animations: ['Run'],
      heading: 90,
      x: 12,
      y: -8,
      size: 80,
      rotationStyle: 'normal',
      visible: true,
      codeLinesNum: 2
    })
  })

  it('samples the same 21-line window used by Copilot around the cursor', () => {
    const source = Array.from({ length: 30 }, (_, index) => `line ${index + 1}`).join('\n')
    const codeEditor = {
      getAttachedUI: () => ({
        activeTextDocument: {
          id: { uri: 'file:///main.spx' },
          getValue: () => source
        },
        cursorPosition: { line: 15, column: 3 },
        selection: {
          start: { line: 14, column: 2 },
          position: { line: 15, column: 3 }
        }
      })
    } as unknown as CodeEditor

    expect(sampleCode(source, { lineStart: 2, lineEnd: 3 })).toEqual({
      lineCount: 30,
      sampledLines: { 2: 'line 2', 3: 'line 3' }
    })
    expect(getActiveCodeDiagnosticContext(codeEditor)).toEqual({
      file: 'main.spx',
      cursor: { line: 15, column: 3 },
      selection: {
        start: { line: 14, column: 2 },
        end: { line: 15, column: 3 }
      },
      sample: {
        lineCount: 30,
        sampledLines: Object.fromEntries(
          Array.from({ length: 21 }, (_, index) => [String(index + 5), `line ${index + 5}`])
        )
      }
    })
  })

  it('keeps the latest 50 logs and errors with source locations', () => {
    const outputs = Array.from({ length: 60 }, (_, index) => ({
      id: index,
      kind: index % 2 === 0 ? RuntimeOutputKind.Log : RuntimeOutputKind.Error,
      time: Date.UTC(2026, 7, 5, 0, 0, index),
      message: `output ${index}`,
      source: {
        textDocument: { uri: 'file:///Hero.spx' },
        range: {
          start: { line: index + 1, column: 1 },
          end: { line: index + 1, column: 2 }
        }
      }
    }))
    const editorCtx = { state: { runtime: { outputs } } } as unknown as EditorCtx

    const context = getRuntimeOutputsDiagnosticContext(editorCtx)

    expect(context.total).toBe(60)
    expect(context.outputs).toHaveLength(50)
    expect(context.outputs[0]).toMatchObject({ message: 'output 10', kind: 'log', file: 'Hero', line: 11 })
    expect(context.outputs[49]).toMatchObject({ message: 'output 59', kind: 'error', file: 'Hero', line: 60 })
  })

  it('normalizes workspace diagnostics without dropping warnings', async () => {
    const codeEditor = {
      diagnosticWorkspace: async () => ({
        items: [
          {
            textDocument: { uri: 'file:///Hero.spx' },
            diagnostics: [
              {
                severity: DiagnosticSeverity.Error,
                range: { start: { line: 8, column: 1 }, end: { line: 8, column: 5 } },
                message: 'Unknown command'
              },
              {
                severity: DiagnosticSeverity.Warning,
                range: { start: { line: 12, column: 1 }, end: { line: 12, column: 5 } },
                message: 'Unused variable'
              }
            ]
          }
        ]
      })
    } as unknown as CodeEditor

    await expect(getCodeDiagnosticsDiagnosticContext(codeEditor)).resolves.toEqual([
      { file: 'Hero', severity: 'error', line: 8, message: 'Unknown command' },
      { file: 'Hero', severity: 'warning', line: 12, message: 'Unused variable' }
    ])
  })
})
