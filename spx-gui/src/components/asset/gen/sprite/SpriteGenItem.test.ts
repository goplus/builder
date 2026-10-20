import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick, reactive } from 'vue'
import { DefaultException } from '@/utils/exception'
import { createI18n, type LocaleMessage } from '@/utils/i18n'
import type { File } from '@/models/common/file'
import { mockFile } from '@/models/common/test'
import { makeSpxProject } from '@/models/spx/common/test'
import { Costume } from '@/models/spx/costume'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { Phase } from '@/models/spx/gen/common'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { SpriteGen, type SpriteGenInits } from '@/models/spx/gen/sprite-gen'
import SpriteGenItem from './SpriteGenItem.vue'

const actionName = { en: 'generate sprite', zh: '生成精灵' }

function failedPhase() {
  return new Phase<never>(actionName, {
    status: 'failed',
    error: new DefaultException({ en: 'Generation failed', zh: '生成失败' })
  })
}

const dispose: (() => void)[] = []
afterEach(() => dispose.splice(0).forEach((fn) => fn()))

function setup(inits: SpriteGenInits = {}) {
  const i18n = createI18n({ lang: 'en' })
  const project = makeSpxProject()
  const gen = new SpriteGen(i18n, project, { settings: { name: 'Robot' }, ...inits })
  const wrapper = mount(SpriteGenItem, {
    props: { gen },
    global: {
      directives: { radar: {} },
      mocks: { $t: (message: LocaleMessage) => message.en }
    }
  })
  dispose.push(() => {
    wrapper.unmount()
    gen.dispose()
    project.dispose()
  })
  return { wrapper, gen, i18n, project }
}

describe('SpriteGenItem generation states', () => {
  it('shows a loading border before content is prepared', () => {
    const { wrapper } = setup({
      genImagesPhase: new Phase(actionName, { status: 'running', timeLeft: null })
    })
    expect(wrapper.classes()).toContain('loading')
    expect(wrapper.classes()).not.toContain('highlight')
    expect(wrapper.find('.generation-ai-marker').exists()).toBe(true)
  })

  it('keeps a waiting card static without a failure dot', () => {
    const { wrapper } = setup()
    expect(wrapper.classes()).not.toContain('loading')
    expect(wrapper.classes()).not.toContain('highlight')
    expect(wrapper.find('.generation-failure-dot').exists()).toBe(false)
  })

  it('changes selection without changing generation state', async () => {
    const { wrapper } = setup({
      prepareContentPhase: new Phase<void>(actionName, { status: 'finished', result: undefined }),
      genImagesPhase: new Phase(actionName, { status: 'running', timeLeft: null }),
      enrichPhase: failedPhase()
    })
    const originalClasses = wrapper.classes()
    const originalContent = wrapper.element.innerHTML
    expect(originalClasses).not.toContain('active')
    expect(originalClasses).not.toContain('ui-block-item-active')
    expect(originalClasses).toContain('loading')
    expect(originalClasses).toContain('highlight')
    expect(wrapper.find('.generation-failure-dot').exists()).toBe(true)

    for (const active of [true, false]) {
      await wrapper.setProps({ active })
      expect(wrapper.classes().includes('active')).toBe(active)
      expect(wrapper.classes().includes('ui-block-item-active')).toBe(active)
      expect(wrapper.classes().filter((name) => name !== 'active' && name !== 'ui-block-item-active')).toEqual(
        originalClasses
      )
      expect(wrapper.element.innerHTML).toBe(originalContent)
    }
  })

  it('keeps the prepared placeholder while a costume finishes and waits to be adopted', async () => {
    const { wrapper, gen, i18n, project } = setup({
      prepareContentPhase: new Phase<void>(actionName, { status: 'finished', result: undefined })
    })
    const readyFile = mockFile('ready.png')
    const generatePhase = reactive(new Phase<File>(actionName, { status: 'running', timeLeft: null })) as Phase<File>
    const finishPhase = reactive(new Phase<Costume>(actionName)) as Phase<Costume>
    gen.costumes.push(new CostumeGen(i18n, gen, project, { generatePhase, finishPhase }))
    await nextTick()
    expect(wrapper.classes()).toContain('loading')
    expect(wrapper.classes()).toContain('highlight')

    // The result is available but the sprite has not been adopted into the project.
    generatePhase.state = { status: 'finished', result: readyFile }
    finishPhase.state = { status: 'finished', result: new Costume('Default', readyFile) }
    await nextTick()
    expect(wrapper.classes()).not.toContain('loading')
    expect(wrapper.classes()).toContain('highlight')
    expect(wrapper.find('.placeholder').exists()).toBe(true)
    expect(wrapper.find('.generation-failure-dot').exists()).toBe(false)
    expect(gen.result).toBeNull()
  })

  it.each(['enrichPhase', 'genImagesPhase', 'prepareContentPhase'] as const)(
    'marks an early failure in %s',
    (phase) => {
      const { wrapper } = setup({ [phase]: failedPhase() })
      expect(wrapper.get('.generation-failure-dot').attributes('aria-label')).toBe('Generation failed')
      expect(wrapper.classes()).not.toContain('highlight')
    }
  )

  it.each(['enrichPhase', 'generatePhase', 'finishPhase'] as const)(
    'keeps the prepared highlight and marks a costume %s failure',
    async (phase) => {
      const { wrapper, gen, i18n, project } = setup({
        prepareContentPhase: new Phase<void>(actionName, { status: 'finished', result: undefined })
      })
      gen.costumes.push(new CostumeGen(i18n, gen, project, { [phase]: failedPhase() }))
      await nextTick()
      expect(wrapper.classes()).toContain('highlight')
      expect(wrapper.find('.generation-failure-dot').exists()).toBe(true)
    }
  )

  it.each(['enrichPhase', 'generateVideoPhase', 'finishPhase'] as const)(
    'marks an animation %s failure',
    async (phase) => {
      const { wrapper, gen, i18n, project } = setup()
      gen.animations.push(new AnimationGen(i18n, gen, project, { [phase]: failedPhase() }))
      await nextTick()
      expect(wrapper.find('.generation-failure-dot').exists()).toBe(true)
    }
  )

  it('removes the failure dot when the failed phase is reset for another attempt', async () => {
    const phase = reactive(failedPhase()) as Phase<never>
    const { wrapper } = setup({ genImagesPhase: phase })
    expect(wrapper.find('.generation-failure-dot').exists()).toBe(true)
    phase.reset()
    await nextTick()
    expect(wrapper.find('.generation-failure-dot').exists()).toBe(false)
  })
})
