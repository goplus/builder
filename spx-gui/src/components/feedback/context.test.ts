import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toText } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import type { EditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { RuntimeOutputKind, type RuntimeOutput } from '@/components/editor/runtime'
import { DiagnosticSeverity, type CodeEditor } from '@/components/editor/spx-code-editor'
import { captureFeedbackContext } from './context'
import { saveProjectSnapshot } from './project-snapshot'

vi.mock('./project-snapshot', { spy: true })

const snapshotUrl = 'kodo://test/files/project-snapshot.json'

function makeProject({ saved = true } = {}) {
  const project = saved ? new SpxProject('alice', 'space') : new SpxProject()
  project.setMetadata({ displayName: 'Space' })
  return project
}

function makeEditorCtx(outputs: RuntimeOutput[] = [], { saved = true, project = makeProject({ saved }) } = {}) {
  return {
    project,
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
  beforeEach(() => {
    vi.mocked(saveProjectSnapshot).mockReset().mockResolvedValue(snapshotUrl)
  })

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
    expect(context.projectSnapshotUrl).toBe(snapshotUrl)
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

  it('captures the project snapshot after in-progress edits finish', async () => {
    const project = makeProject()
    const sprite = new Sprite('Rocket')
    sprite.setCode('v1')
    project.addSprite(sprite)
    let uploadedCode: string | null = null
    vi.mocked(saveProjectSnapshot).mockImplementation(async (files) => {
      // The user keeps editing while the snapshot uploads.
      sprite.setCode('v3')
      const codeFile = Object.entries(files).find(([path]) => path.endsWith('Rocket.spx'))![1]!
      uploadedCode = await toText(codeFile)
      return snapshotUrl
    })

    const unlock = await project.mutex.lock()
    const contextPromise = captureFeedbackContext({
      source: 'profileMenu',
      path: '/editor/alice/space',
      language: 'en',
      editorCtx: makeEditorCtx([], { project }),
      codeEditor: null,
      maxSize: Infinity
    })
    sprite.setCode('v2')
    unlock()
    const context = await contextPromise

    expect(context.projectSnapshotUrl).toBe(snapshotUrl)
    expect(uploadedCode).toBe('v2')
  })

  it('omits the project snapshot when it cannot be saved', async () => {
    vi.mocked(saveProjectSnapshot).mockRejectedValue(new Error('upload failed'))

    const context = await captureFeedbackContext({
      source: 'profileMenu',
      path: '/editor/alice/space',
      language: 'en',
      editorCtx: makeEditorCtx(),
      codeEditor: null,
      maxSize: Infinity
    })

    expect(context.project).toBeDefined()
    expect(context.projectSnapshotUrl).toBeUndefined()
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
