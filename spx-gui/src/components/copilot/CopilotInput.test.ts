import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Copilot } from './copilot'
import CopilotInput from './CopilotInput.vue'
import { InMemorySkillRegistry } from './skills/registry'

vi.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (message: { zh: string }) => message.zh })
}))
vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMessage: () => ({ error: vi.fn() })
}))

const wrappers: Array<ReturnType<typeof mount>> = []
const copilots: Copilot[] = []

function createCopilot() {
  const generateCopilotMessage = vi.fn()
  const copilot = new Copilot(new InMemorySkillRegistry(), { generateCopilotMessage })
  const send = vi.spyOn(copilot, 'addUserTextMessage').mockImplementation(() => {})
  copilots.push(copilot)
  return { copilot, send, generateCopilotMessage }
}

function mountInput(copilot: Copilot) {
  const wrapper = mount(CopilotInput, {
    attachTo: document.body,
    props: { copilot },
    global: { mocks: { $t: (message: { zh: string }) => message.zh } }
  })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear()
  })
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  copilots.splice(0).forEach((copilot) => copilot.dispose())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Copilot question drafts', () => {
  it('opens and focuses a prefilled draft without sending a message or starting a session', async () => {
    const { copilot, send, generateCopilotMessage } = createCopilot()
    copilot.close()
    const wrapper = mountInput(copilot)
    copilot.prefillInput('我想让角色追着鼠标走，可以怎么做？')
    await flushPromises()
    expect(copilot.active).toBe(true)
    expect(wrapper.get('textarea').element.value).toBe('我想让角色追着鼠标走，可以怎么做？')
    expect(document.activeElement).toBe(wrapper.get('textarea').element)
    expect(copilot.currentSession).toBe(null)
    expect(send).not.toHaveBeenCalled()
    expect(generateCopilotMessage).not.toHaveBeenCalled()
  })

  it.each(['  我原本想问的问题  ', '   '])(
    'preserves existing unsent draft %j and conversation while focusing the already-open panel',
    async (draft) => {
      const { copilot, send, generateCopilotMessage } = createCopilot()
      await copilot.startSession({
        title: { en: 'Existing topic', zh: '原有对话' },
        description: '',
        reactToEvents: false
      })
      const session = copilot.currentSession
      const wrapper = mountInput(copilot)
      const textarea = wrapper.get('textarea')
      await textarea.setValue(draft)
      textarea.element.blur()
      copilot.prefillInput('新的搜索问题')
      await flushPromises()
      expect(textarea.element.value).toBe(draft)
      expect(document.activeElement).toBe(textarea.element)
      expect(copilot.currentSession).toBe(session)
      expect(session?.rounds).toHaveLength(0)
      expect(send).not.toHaveBeenCalled()
      expect(generateCopilotMessage).not.toHaveBeenCalled()
    }
  )

  it('retains a prefilled draft if the input mounts after the request', async () => {
    const { copilot, send, generateCopilotMessage } = createCopilot()
    copilot.prefillInput('我想实现分身，可以怎么做？')
    const wrapper = mountInput(copilot)
    await flushPromises()
    expect(wrapper.get('textarea').element.value).toBe('我想实现分身，可以怎么做？')
    expect(document.activeElement).toBe(wrapper.get('textarea').element)
    expect(send).not.toHaveBeenCalled()
    expect(generateCopilotMessage).not.toHaveBeenCalled()
  })

  it('preserves an edited unsent draft when the input remounts', async () => {
    const { copilot, send, generateCopilotMessage } = createCopilot()
    copilot.prefillInput('最初的搜索问题')
    const wrapper = mountInput(copilot)
    await wrapper.get('textarea').setValue('用户补充的草稿')
    wrappers.pop()?.unmount()
    const remounted = mountInput(copilot)
    await flushPromises()
    expect(remounted.get('textarea').element.value).toBe('用户补充的草稿')
    copilot.prefillInput('另一个搜索问题')
    await flushPromises()
    expect(remounted.get('textarea').element.value).toBe('用户补充的草稿')
    expect(document.activeElement).toBe(remounted.get('textarea').element)
    expect(send).not.toHaveBeenCalled()
    expect(generateCopilotMessage).not.toHaveBeenCalled()
  })

  it('allows editing and sends only after the user explicitly submits', async () => {
    const { copilot, send, generateCopilotMessage } = createCopilot()
    const wrapper = mountInput(copilot)
    copilot.prefillInput('原搜索内容')
    await flushPromises()
    await wrapper.get('textarea').setValue('我补充后的问题')
    expect(send).not.toHaveBeenCalled()
    await wrapper.get('.submit-btn').trigger('click')
    expect(send).toHaveBeenCalledExactlyOnceWith('我补充后的问题')
    expect(copilot.inputDraft).toBe('')
    expect(wrapper.get('textarea').element.value).toBe('')
    expect(generateCopilotMessage).not.toHaveBeenCalled()
  })
})
