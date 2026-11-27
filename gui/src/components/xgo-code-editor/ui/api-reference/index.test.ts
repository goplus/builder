import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, shallowReactive } from 'vue'
import { EmptyAPIReferenceProvider } from '../../api-reference'
import type { ITextDocument } from '../../common'
import type { CodeEditorUIController } from '../code-editor-ui'
import { APIReferenceController, type APIReferenceItem, type IAPIReferenceProvider } from '.'

function createProvider(provideAPIReference: IAPIReferenceProvider['provideAPIReference']): IAPIReferenceProvider {
  return Object.assign(new EmptyAPIReferenceProvider(), { provideAPIReference })
}

it('uses the current provider for search and supports the default local matcher', async () => {
  const animate = { definition: { name: 'Sprite.animate' }, overview: 'animate name' } as APIReferenceItem
  const say = { definition: { name: 'Sprite.say' }, overview: 'say message' } as APIReferenceItem
  const items = [animate, say]
  const codeEditor = { apiReferenceProvider: createProvider(async () => items) }
  const controller = new APIReferenceController({ codeEditor } as unknown as CodeEditorUIController)
  const signal = new AbortController().signal

  expect(await controller.search(items, ' MESSAGE ', signal)).toEqual([say])

  const searchAPIReference = vi.fn().mockResolvedValue([animate])
  codeEditor.apiReferenceProvider = Object.assign(
    createProvider(async () => items),
    { searchAPIReference }
  )
  expect(await controller.search(items, 'run an animation', signal)).toEqual([animate])
  expect(searchAPIReference).toHaveBeenCalledExactlyOnceWith(items, 'run an animation', signal)
  controller.dispose()
})

describe('API Reference data loading', () => {
  it('distinguishes pending requests from completed empty results on provider and document changes', async () => {
    const items = [{} as APIReferenceItem]
    const codeEditor = shallowReactive({ apiReferenceProvider: createProvider(async () => []) })
    const ui = shallowReactive({ codeEditor, activeTextDocument: {} as ITextDocument })
    const controller = new APIReferenceController(ui as unknown as CodeEditorUIController)
    controller.init()
    expect(controller.items).toBeNull()
    await flushPromises()
    expect(controller.items).toEqual([])

    let finishLoading!: (items: APIReferenceItem[]) => void
    codeEditor.apiReferenceProvider = createProvider(
      () =>
        new Promise((resolve) => {
          finishLoading = resolve
        })
    )
    await nextTick()
    expect(controller.items).toBeNull()
    expect(controller.error).toBeNull()
    finishLoading(items)
    await flushPromises()
    expect(controller.items).toEqual(items)

    ui.activeTextDocument = {} as ITextDocument
    await nextTick()
    expect(controller.items).toBeNull()
    finishLoading([])
    await flushPromises()
    expect(controller.items).toEqual([])
    controller.dispose()
  })

  it('keeps the latest filter result when an earlier request completes late', async () => {
    let finishOldRequest!: (items: APIReferenceItem[]) => void
    const codeEditor = shallowReactive({
      apiReferenceProvider: createProvider(
        () =>
          new Promise((resolve) => {
            finishOldRequest = resolve
          })
      )
    })
    const ui = { codeEditor, activeTextDocument: {} as ITextDocument }
    const controller = new APIReferenceController(ui as unknown as CodeEditorUIController)
    controller.init()
    codeEditor.apiReferenceProvider = createProvider(vi.fn(async () => []))
    await flushPromises()
    expect(controller.items).toEqual([])
    finishOldRequest([{} as APIReferenceItem])
    await flushPromises()
    expect(controller.items).toEqual([])
    controller.dispose()
  })
})
