import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, shallowRef } from 'vue'
import { fromText, type Files } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { History } from '@/components/editor/history'
import { SpxCodeEditorProject } from '@/components/editor/spx-code-editor/spx-project'
import type { ITextDocument } from '../../common'
import { InlayHintKind, type InlayHintItem } from '../../inlay-hint'
import type { IXGoProject } from '../../project'
import type { CodeEditorUIController } from '../code-editor-ui'
import { InlayHintController } from '.'

const hint: InlayHintItem = {
  label: 'distance',
  kind: InlayHintKind.Parameter,
  position: { line: 1, column: 6 },
  tooltip: null
}
const controllers: InlayHintController[] = []

function setup(
  simpleMode = true,
  initialSource = 'step 10',
  initialHints = [hint],
  projectOverride: IXGoProject | null = null,
  codePath = 'main.spx'
) {
  const source = shallowRef(initialSource)
  const externalFiles = shallowRef<Files>({ 'definitions.spx': fromText('definitions.spx', 'var value = 10') })
  const files = computed(() => ({ 'main.spx': fromText('main.spx', source.value), ...externalFiles.value }))
  const ownerCode = shallowRef<string | null>(null)
  const textDocument = { id: { uri: `file:///${codePath}` }, getValue: () => source.value } as ITextDocument
  const active = shallowRef<ITextDocument | null>(textDocument)
  const listeners = new Map<string, (event?: any) => void>()
  const listen = (event: string) => (listener: (event?: any) => void) => {
    listeners.set(event, listener)
    return { dispose: vi.fn(() => listeners.delete(event)) }
  }
  const provider = { provideInlayHints: vi.fn(async () => (source.value === initialSource ? initialHints : [])) }
  const ui = {
    simpleMode,
    get activeTextDocument() {
      return active.value
    },
    project: projectOverride ?? {
      exportFiles: () => files.value,
      getCodeOwner: () => ({ getCode: () => ownerCode.value ?? source.value })
    },
    codeEditor: { inlayHintProvider: provider },
    editor: {
      getPosition: () => ({ lineNumber: 1, column: 6 }),
      onDidChangeModelContent: listen('content'),
      onDidChangeCursorPosition: listen('cursor'),
      onDidBlurEditorText: listen('blur'),
      onDidCompositionStart: listen('compositionStart'),
      onDidCompositionEnd: listen('compositionEnd')
    }
  } as unknown as CodeEditorUIController
  const controller = new InlayHintController(ui)
  controllers.push(controller)
  controller.init()
  const tick = async () => {
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
  }
  const change = async (start: number, end: number, text = '') => {
    const before = source.value
    const position = (offset: number) => {
      const lines = before.slice(0, offset).split('\n')
      return { line: lines.length, column: lines[lines.length - 1].length + 1 }
    }
    const from = position(start)
    const to = position(end)
    source.value = before.slice(0, start) + text + before.slice(end)
    listeners.get('content')?.({
      changes: [
        {
          range: { startLineNumber: from.line, startColumn: from.column, endLineNumber: to.line, endColumn: to.column },
          rangeLength: end - start,
          rangeOffset: start,
          text
        }
      ]
    })
    await nextTick()
  }
  const deleteArgument = () => change(5, 7)
  return { source, active, externalFiles, ownerCode, listeners, provider, controller, tick, change, deleteArgument }
}

afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.dispose())
  vi.useRealTimers()
})

describe('Simple Mode inlay hint stability', () => {
  it('does not display or cache recovered wrong labels when an incomplete call is loaded initially', async () => {
    vi.useFakeTimers()
    const original = 'step 10\nglide 100, 200, \n'
    const labels = [
      hint,
      { ...hint, label: 'target', position: { line: 2, column: 7 } },
      { ...hint, label: 'secs', position: { line: 2, column: 12 } }
    ]
    const { controller, tick } = setup(true, original, labels)
    await tick()
    expect(controller.items).toEqual([hint])
  })

  it('retains a confirmed label when its numeric argument is deleted, including after a fresh empty result', async () => {
    vi.useFakeTimers()
    const { controller, tick, deleteArgument, source } = setup()
    await tick()
    expect(controller.items).toEqual([hint])
    await deleteArgument()
    expect(controller.items).toEqual([{ ...hint, retained: true }])
    await tick()
    expect(controller.items).toEqual([{ ...hint, retained: true }])
    expect(source.value).toBe('step ')
  })

  it('keeps a proven slot visible while a local edit awaits fresh hints', async () => {
    vi.useFakeTimers()
    const { controller, tick, change } = setup()
    await tick()
    await change(6, 7)
    expect(controller.items).toEqual([{ ...hint, retained: true }])
    await tick()
    expect(controller.items).toEqual([])
  })

  it.each(['cursor', 'blur'])('keeps proven labels after %s until code or semantics changes', async (event) => {
    vi.useFakeTimers()
    const { controller, tick, deleteArgument, listeners } = setup()
    await tick()
    await deleteArgument()
    listeners.get(event)?.({ position: { lineNumber: 2, column: 1 } })
    expect(controller.items).toEqual([{ ...hint, retained: true }])
  })

  it('drops the binding when composition makes interpretation uncertain', async () => {
    vi.useFakeTimers()
    const { controller, tick, deleteArgument, listeners } = setup()
    await tick()
    await deleteArgument()
    listeners.get('compositionStart')?.()
    expect(controller.items).toEqual([])
  })

  it('ignores stale responses after another edit and after switching documents', async () => {
    vi.useFakeTimers()
    const { controller, tick, source, provider, listeners, active } = setup()
    let resolve: (items: InlayHintItem[]) => void = () => {}
    provider.provideInlayHints.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r
        })
    )
    await tick()
    source.value = 'turn '
    listeners.get('content')?.({
      changes: [{ range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 8 }, text: 'turn ' }]
    })
    resolve([hint])
    await nextTick()
    await Promise.resolve()
    expect(controller.items).toEqual([])
    active.value = { id: { uri: 'file:///other.spx' }, getValue: () => 'other 20' } as ITextDocument
    await tick()
    expect(controller.items).toEqual([])
  })

  it.each(['change', 'add', 'remove'])(
    'clears a retained label after another file is affected: %s',
    async (operation) => {
      vi.useFakeTimers()
      const { controller, tick, deleteArgument, externalFiles } = setup()
      await tick()
      await deleteArgument()
      expect(controller.items).toEqual([{ ...hint, retained: true }])
      externalFiles.value =
        operation === 'remove'
          ? {}
          : operation === 'add'
            ? { ...externalFiles.value, 'another.spx': fromText('another.spx', 'var x = 1') }
            : { 'definitions.spx': fromText('definitions.spx', 'var value = 20') }
      expect(controller.items).toEqual([])
      await tick()
      expect(controller.items).toEqual([])
    }
  )

  it('discards a request whose project context changes while awaiting its result', async () => {
    vi.useFakeTimers()
    const { controller, tick, externalFiles, provider } = setup()
    let resolve: (items: InlayHintItem[]) => void = () => {}
    provider.provideInlayHints.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r
        })
    )
    await tick()
    externalFiles.value = { 'definitions.spx': fromText('definitions.spx', 'var value = 20') }
    resolve([hint])
    await nextTick()
    await Promise.resolve()
    expect(controller.items).toEqual([])
  })

  it('waits until the project owner code matches the current model', async () => {
    vi.useFakeTimers()
    const { controller, tick, ownerCode, provider } = setup()
    ownerCode.value = 'step 20'
    await tick()
    expect(provider.provideInlayHints).not.toHaveBeenCalled()
    expect(controller.items).toEqual([])
  })

  it('freezes confirmed labels by argument slot while recovery shifts a surviving argument', async () => {
    vi.useFakeTimers()
    const original = 'step 100, 1'
    const labels = [hint, { ...hint, label: 'speed', position: { line: 1, column: 11 } }]
    const { source, controller, provider, tick, change } = setup(true, original, labels)
    await tick()
    await change(5, 8)
    expect(controller.items?.map((item) => [item.label, item.position])).toEqual([
      ['distance', { line: 1, column: 6 }],
      ['speed', { line: 1, column: 8 }]
    ])
    provider.provideInlayHints.mockResolvedValue([{ ...hint, position: { line: 1, column: 8 } }])
    await tick()
    expect(controller.items?.map((item) => [item.label, item.position.column])).toEqual([
      ['distance', 6],
      ['speed', 8]
    ])
    expect(source.value).toBe('step , 1')
  })

  it('keeps the final bare-call slot on its original line when a newline follows the deleted value', async () => {
    vi.useFakeTimers()
    const original = 'glide 100, 200, 1\n'
    const labels = [
      { ...hint, label: 'x', position: { line: 1, column: 7 } },
      { ...hint, label: 'y', position: { line: 1, column: 12 } },
      { ...hint, label: 'secs', position: { line: 1, column: 17 } }
    ]
    const { controller, provider, tick, change, source } = setup(true, original, labels)
    await tick()
    await change(16, 17)
    provider.provideInlayHints.mockResolvedValue([
      { ...labels[0], label: 'target' },
      { ...labels[1], label: 'secs' }
    ])
    await tick()
    expect(controller.items?.map((item) => [item.label, item.position])).toEqual([
      ['x', { line: 1, column: 7 }],
      ['y', { line: 1, column: 12 }],
      ['secs', { line: 1, column: 17 }]
    ])
    expect(source.value).toBe('glide 100, 200, \n')
  })

  it('reconfirms labels only after all missing argument slots have been filled', async () => {
    vi.useFakeTimers()
    const original = 'glide 100, 200, 1'
    const labels = [
      { ...hint, label: 'x', position: { line: 1, column: 7 } },
      { ...hint, label: 'y', position: { line: 1, column: 12 } },
      { ...hint, label: 'seconds', position: { line: 1, column: 17 } }
    ]
    const { controller, provider, tick, change } = setup(true, original, labels)
    await tick()
    await change(11, 14)
    provider.provideInlayHints.mockResolvedValue([{ ...labels[1], label: 'x', position: { line: 1, column: 14 } }])
    await tick()
    expect(controller.items?.map((item) => item.label)).toEqual(['x', 'y', 'seconds'])
    await change(11, 11, '300')
    const fresh = labels.map((item) => ({ ...item, label: `new-${item.label}` }))
    provider.provideInlayHints.mockResolvedValue(fresh)
    await tick()
    expect(controller.items).toEqual(fresh)
  })

  it('retains multiline slots with real SPX exports that recreate unchanged configuration files', async () => {
    vi.useFakeTimers()
    const original = 'four(\n  1,\n  2,\n  3,\n  4,\n)'
    const labels = [1, 2, 3, 4].map((number) => ({
      ...hint,
      label: `p${number}`,
      position: { line: number + 1, column: 3 }
    }))
    const spx = new SpxProject()
    const sprite = new Sprite('Lita')
    sprite.setCode(original)
    spx.addSprite(sprite)
    const project = new SpxCodeEditorProject(spx, new History(spx))
    const { source, controller, tick, change } = setup(true, original, labels, project, sprite.codeFilePath)
    await tick()
    expect(controller.items).toEqual(labels)
    await change(original.indexOf('2'), original.indexOf('2') + 1)
    expect(controller.items?.map((item) => item.label)).toEqual(['p1', 'p2', 'p3', 'p4'])
    sprite.setCode(source.value)
    await tick()
    expect(controller.items?.map((item) => [item.label, item.position])).toEqual([
      ['p1', { line: 2, column: 3 }],
      ['p2', { line: 3, column: 3 }],
      ['p3', { line: 4, column: 3 }],
      ['p4', { line: 5, column: 3 }]
    ])
    expect(sprite.code).toBe('four(\n  1,\n  ,\n  3,\n  4,\n)')
    spx.dispose()
  })

  it('keeps Normal Mode provider behavior and does not install editing retention listeners', async () => {
    vi.useFakeTimers()
    const { controller, tick, deleteArgument, listeners } = setup(false)
    await tick()
    expect(controller.items).toEqual([hint])
    expect(listeners.size).toBe(0)
    await deleteArgument()
    await tick()
    expect(controller.items).toEqual([])
  })
})
