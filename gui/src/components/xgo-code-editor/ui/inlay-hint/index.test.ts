import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, shallowRef } from 'vue'
import { fromText, type Files } from '@/models/common/file'
import type { ITextDocument } from '../../common'
import { InlayHintKind, type InlayHintItem } from '../../inlay-hint'
import type { CodeEditorUIController } from '../code-editor-ui'
import { InlayHintController } from '.'

const hint: InlayHintItem = {
  label: 'distance',
  kind: InlayHintKind.Parameter,
  position: { line: 1, column: 6 },
  tooltip: null
}
const controllers: InlayHintController[] = []

function setup(simpleMode = true) {
  const source = shallowRef('step 10')
  const externalFiles = shallowRef<Files>({ 'definitions.spx': fromText('definitions.spx', 'var value = 10') })
  const files = computed(() => ({ 'main.spx': fromText('main.spx', source.value), ...externalFiles.value }))
  const ownerCode = shallowRef<string | null>(null)
  const textDocument = { id: { uri: 'file:///main.spx' }, getValue: () => source.value } as ITextDocument
  const active = shallowRef<ITextDocument | null>(textDocument)
  const listeners = new Map<string, (event?: any) => void>()
  const listen = (event: string) => (listener: (event?: any) => void) => {
    listeners.set(event, listener)
    return { dispose: vi.fn(() => listeners.delete(event)) }
  }
  const provider = { provideInlayHints: vi.fn(async () => (source.value === 'step 10' ? [hint] : [])) }
  const ui = {
    simpleMode,
    get activeTextDocument() {
      return active.value
    },
    project: {
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
  const deleteArgument = async () => {
    source.value = 'step '
    listeners.get('content')?.({
      changes: [
        {
          range: { startLineNumber: 1, startColumn: 6, endLineNumber: 1, endColumn: 8 },
          rangeLength: 2,
          rangeOffset: 5,
          text: ''
        }
      ]
    })
    await nextTick()
  }
  return { source, active, externalFiles, ownerCode, listeners, provider, controller, tick, deleteArgument }
}

afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.dispose())
  vi.useRealTimers()
})

describe('Simple Mode inlay hint stability', () => {
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

  it.each(['cursor', 'blur', 'compositionStart'])('drops retained labels on %s', async (event) => {
    vi.useFakeTimers()
    const { controller, tick, deleteArgument, listeners } = setup()
    await tick()
    await deleteArgument()
    listeners.get(event)?.({ position: { lineNumber: 2, column: 1 } })
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
