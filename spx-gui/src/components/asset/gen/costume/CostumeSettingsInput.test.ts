import { flushPromises, shallowMount } from '@vue/test-utils'
import { h, nextTick, shallowReactive } from 'vue'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { Facing } from '@/apis/aigc'
import { mockFile } from '@/models/common/test'
import { Costume } from '@/models/spx/costume'
import { Phase } from '@/models/spx/gen/common'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import SettingsInput from '../common/SettingsInput.vue'
import FacingInput from './FacingInput.vue'
import CostumeSettingsInput from './CostumeSettingsInput.vue'

const { messageError } = vi.hoisted(() => ({ messageError: vi.fn() }))

vi.mock('@/components/ui/message/UIMessageProvider.vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/message/UIMessageProvider.vue')>()),
  useMessage: () => ({ error: messageError, success: vi.fn() })
}))

function globalOptions(i18n = createI18n({ lang: 'zh' })) {
  return {
    plugins: [i18n],
    stubs: { SettingsInput: false, UIButton: false },
    directives: {
      radar: (element: HTMLElement, binding: { value: { name: string } }) => {
        element.setAttribute('aria-label', binding.value.name)
      }
    }
  }
}

function setupCostume(completed: boolean) {
  const i18n = createI18n({ lang: 'zh' })
  const project = new SpxProject()
  const sprite = new Sprite('Cat')
  const source = new Costume('idle', mockFile('idle.png'))
  const generatePhase = shallowReactive(new Phase<typeof source.img>({ en: 'generate costume', zh: '生成造型' }))
  sprite.addCostume(source)
  project.addSprite(sprite)
  const gen = new CostumeGen(i18n, sprite, project, {
    settings: { name: 'idle', description: 'A cat' },
    image: source.img,
    generatePhase,
    finishPhase: completed
      ? new Phase({ en: 'save costume', zh: '保存造型' }, { status: 'finished', result: source })
      : undefined
  })
  const generate = vi.spyOn(gen, 'generate').mockResolvedValue()
  const wrapper = shallowMount(CostumeSettingsInput, {
    props: { gen },
    global: globalOptions(i18n)
  })
  onTestFinished(() => {
    wrapper.unmount()
    gen.dispose()
    project.dispose()
  })
  return { wrapper, gen, generate, generatePhase, sprite, source }
}

describe('CostumeSettingsInput', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps saved costume settings editable and regenerates with the same submit button', async () => {
    const { wrapper, gen, generate, sprite, source } = setupCostume(true)
    expect(wrapper.get('textarea').attributes('readonly')).toBeUndefined()
    expect(wrapper.getComponent(SettingsInput).props('readonly')).toBe(false)
    await wrapper.get('textarea').setValue('Make the clothes red')
    wrapper.getComponent(FacingInput).vm.$emit('update:value', Facing.Left)
    expect(gen.settings.description).toBe('Make the clothes red')
    expect(gen.settings.facing).toBe(Facing.Left)
    const submit = wrapper.get('button[aria-label="Submit"]')
    expect(submit.text()).toBe('重新生成')

    await submit.trigger('click')
    expect(generate).toHaveBeenCalledTimes(1)
    expect(gen.result).toBe(source)
    expect(sprite.costumes).toEqual([source])
  })

  it('keeps the description and generate action editable for an unfinished costume', async () => {
    const { wrapper, gen, generate } = setupCostume(false)
    expect(wrapper.get('textarea').attributes('readonly')).toBeUndefined()
    const submit = wrapper.get('button[aria-label="Submit"]')
    await wrapper.get('textarea').setValue('')
    expect(submit.attributes('disabled')).toBeDefined()
    await wrapper.get('textarea').setValue('Make the clothes red')
    expect(gen.settings.description).toBe('Make the clothes red')
    expect(submit.attributes('disabled')).toBeUndefined()
    expect(submit.text()).toBe('生成')
    await submit.trigger('click')
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('disables settings only while generating and restores them when generation finishes', async () => {
    const { wrapper, generatePhase, source } = setupCostume(false)
    generatePhase.state = { status: 'running', timeLeft: null }
    await nextTick()
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[aria-label="Submit"]').attributes('disabled')).toBeDefined()

    generatePhase.state = { status: 'finished', result: source.img }
    await nextTick()
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('textarea').attributes('readonly')).toBeUndefined()
    const submit = wrapper.get('button[aria-label="Submit"]')
    expect(submit.attributes('disabled')).toBeUndefined()
    expect(submit.text()).toBe('重新生成')
  })

  it('reports generation failures through the standard message handler', async () => {
    const { wrapper, generate } = setupCostume(false)
    generate.mockRejectedValueOnce(new Error('Service unavailable'))
    await wrapper.get('button[aria-label="Submit"]').trigger('click')
    await flushPromises()

    expect(messageError).toHaveBeenCalledTimes(1)
    expect(messageError).toHaveBeenCalledWith(expect.stringContaining('生成造型失败'))
  })

  it('preserves readonly behavior for other settings callers', async () => {
    const wrapper = shallowMount(SettingsInput, {
      props: { description: 'Existing animation', readonly: true },
      slots: { submit: () => h('button', 'Generate animation') },
      global: globalOptions()
    })
    onTestFinished(() => wrapper.unmount())

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.get('textarea').attributes('readonly')).toBeDefined()
    await wrapper.setProps({ readonly: false })
    expect(wrapper.get('button').text()).toBe('Generate animation')
  })
})
