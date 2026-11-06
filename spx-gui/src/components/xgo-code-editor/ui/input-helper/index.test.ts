import { describe, expect, it, vi } from 'vitest'
import type { CodeEditorUIController } from '../code-editor-ui'
import { InputHelperController, type InternalInputSlot } from '.'

describe('Input Helper closing', () => {
  it('can close before the Monaco editor is initialized when there is no active input', () => {
    const controller = new InputHelperController({} as CodeEditorUIController)
    controller.stopInputing()
    expect(controller.inputingSlot).toBeNull()
    controller.dispose()
  })

  it.each(['stop', 'toggle'])('clears an active input without needing the editor on %s', (method) => {
    const controller = new InputHelperController({} as CodeEditorUIController)
    vi.spyOn(controller, 'slots', 'get').mockReturnValue([{ id: 'slot' } as InternalInputSlot])
    controller.startInputing('slot')
    if (method === 'stop') controller.stopInputing()
    else controller.toggleInputing('slot')
    expect(controller.inputingSlot).toBeNull()
    controller.dispose()
  })

  it.each(['stop', 'toggle'])('returns focus to the editor when requested on %s', (method) => {
    const focus = vi.fn()
    const controller = new InputHelperController({ editor: { focus } } as unknown as CodeEditorUIController)
    vi.spyOn(controller, 'slots', 'get').mockReturnValue([{ id: 'slot' } as InternalInputSlot])
    controller.startInputing('slot')
    if (method === 'stop') controller.stopInputing(true)
    else controller.toggleInputing('slot', true)
    expect(controller.inputingSlot).toBeNull()
    expect(focus).toHaveBeenCalledOnce()
    controller.dispose()
  })
})
