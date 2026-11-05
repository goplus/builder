import { describe, expect, it, vi } from 'vitest'
import type { ICopilot } from '../../copilot'
import type { CodeEditorUIController } from '../code-editor-ui'
import { APIReferenceController } from '.'

function createController(copilot: ICopilot | null, language = 'zh') {
  return new APIReferenceController({
    codeEditor: { copilot },
    i18n: { t: (message: { en: string; zh: string }) => (language === 'zh' ? message.zh : message.en) }
  } as unknown as CodeEditorUIController)
}

describe('API Reference Copilot drafts', () => {
  it.each(['zh', 'en'])('prepares a localized draft without sending (%s)', (language) => {
    const copilot = { prefillInput: vi.fn(), addUserTextMessage: vi.fn() }
    const controller = createController(copilot, language)
    expect(controller.canAskCopilot).toBe(true)
    controller.askCopilot('  让角色追着鼠标走  ')
    expect(copilot.prefillInput).toHaveBeenCalledExactlyOnceWith(
      language === 'zh'
        ? '我想实现「让角色追着鼠标走」，可以怎么做？'
        : 'I want to 让角色追着鼠标走. How can I do this?'
    )
    expect(copilot.addUserTextMessage).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('ignores empty input and supports hosts without the optional prefill capability', () => {
    const copilot = { prefillInput: vi.fn(), addUserTextMessage: vi.fn() }
    const controller = createController(copilot)
    controller.askCopilot('  ')
    expect(copilot.prefillInput).not.toHaveBeenCalled()
    expect(createController({ addUserTextMessage: vi.fn() }).canAskCopilot).toBe(false)
    const unavailable = createController(null)
    expect(unavailable.canAskCopilot).toBe(false)
    expect(() => unavailable.askCopilot('移动')).not.toThrow()
    controller.dispose()
    unavailable.dispose()
  })
})
