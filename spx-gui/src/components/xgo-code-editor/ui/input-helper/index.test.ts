import { describe, expect, it } from 'vitest'
import type { CodeEditorUIController } from '../code-editor-ui'
import { InputHelperController } from '.'

describe('Input Helper closing', () => {
  it('can close before the Monaco editor is initialized when there is no active input', () => {
    const controller = new InputHelperController({} as CodeEditorUIController)
    controller.stopInputing()
    expect(controller.inputingSlot).toBeNull()
    controller.dispose()
  })
})
