import { flushPromises, shallowMount } from '@vue/test-utils'
import { nextTick, ref, shallowReactive } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { DefaultException } from '@/utils/exception'
import { mockFile } from '@/models/common/test'
import { Costume } from '@/models/spx/costume'
import { Phase } from '@/models/spx/gen/common'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { UIError } from '@/components/ui'
import CostumeDetail from '@/components/editor/sprite/CostumeDetail.vue'
import GenLoading from '../common/GenLoading.vue'
import GenStateFailed from '../common/GenStateFailed.vue'
import CostumeGenPreview from './CostumeGenPreview.vue'

vi.mock('../..', () => ({ useRenameCostumeGen: () => vi.fn() }))

vi.mock('@/utils/img-rendering', () => ({
  useRenderableImageUrl: () => [ref('blob:costume'), ref(false)]
}))

vi.mock('@/components/ui/message/UIMessageProvider.vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/message/UIMessageProvider.vue')>()),
  useMessage: () => ({ error: vi.fn(), success: vi.fn() })
}))

function setup() {
  const i18n = createI18n({ lang: 'zh' })
  const project = new SpxProject()
  const sprite = new Sprite('Cat')
  const source = new Costume('idle', mockFile('idle.png'))
  const result = source.clone(true)
  sprite.addCostume(result)
  project.addSprite(sprite)
  const generatePhase = shallowReactive(new Phase<typeof source.img>({ en: 'generate costume', zh: '生成造型' }))
  const finishPhase = shallowReactive(
    new Phase<Costume>({ en: 'save costume', zh: '保存造型' }, { status: 'finished', result })
  )
  const gen = new CostumeGen(i18n, sprite, project, {
    settings: { name: 'idle', description: 'A cat' },
    image: source.img,
    generatePhase,
    finishPhase
  })
  const finish = vi.spyOn(gen, 'finish').mockImplementation(async () => {
    if (gen.image == null) throw new Error('image expected')
    const saved = new Costume(result.name, gen.image, { id: result.id })
    finishPhase.state = { status: 'finished', result: saved }
    return saved
  })
  const wrapper = shallowMount(CostumeGenPreview, {
    props: { gen },
    global: {
      plugins: [i18n],
      renderStubDefaultSlot: true,
      stubs: { GenPreview: false, UIButton: false, PreviewWithCheckerboardBg: false, GenStateFailed: false },
      directives: { radar: () => {} }
    }
  })
  onTestFinished(() => {
    wrapper.unmount()
    gen.dispose()
    project.dispose()
  })
  return { wrapper, gen, source, result, generatePhase, finish }
}

describe('CostumeGenPreview', () => {
  it('uses the editing progress message when provided', async () => {
    const { wrapper, generatePhase } = setup()
    await wrapper.setProps({ pendingMessage: { en: 'Editing costume...', zh: '正在修改造型...' } })
    generatePhase.state = { status: 'running', timeLeft: null }
    await nextTick()

    expect(wrapper.getComponent(GenLoading).text()).toContain('正在修改造型')
    expect(wrapper.getComponent(GenLoading).text()).not.toContain('正在生成造型')
  })

  it('shows regeneration progress and saves a new preview before returning to costume detail', async () => {
    const { wrapper, gen, source, result, generatePhase, finish } = setup()
    const originalImage = source.img
    expect(wrapper.getComponent(CostumeDetail).props('costume')).toBe(result)

    generatePhase.state = { status: 'running', timeLeft: null }
    await nextTick()
    expect(wrapper.findComponent(CostumeDetail).exists()).toBe(false)
    expect(wrapper.getComponent(GenLoading).text()).toContain('正在生成造型')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(gen.result).toBe(result)
    expect(gen.image).toBe(originalImage)

    const image = mockFile('regenerated.png')
    gen.setImage(image)
    generatePhase.state = { status: 'finished', result: image }
    await nextTick()
    expect(wrapper.findComponent(CostumeDetail).exists()).toBe(false)
    expect(wrapper.findComponent(GenLoading).exists()).toBe(false)
    expect(gen.result).toBe(result)
    expect(result.img).toBe(originalImage)
    const save = wrapper.get('button')
    expect(save.text()).toBe('保存造型')
    await save.trigger('click')
    await flushPromises()

    expect(finish).toHaveBeenCalledTimes(1)
    expect(wrapper.getComponent(CostumeDetail).props('costume')).toBe(gen.result)
    expect(gen.result?.id).toBe(result.id)
    expect(gen.result?.img).toBe(image)
    expect(source.img).toBe(originalImage)
  })

  it('shows a generation error without offering to save or discarding the previous costume', async () => {
    const { wrapper, gen, source, result, generatePhase } = setup()
    generatePhase.state = {
      status: 'failed',
      error: new DefaultException({ en: 'Generation failed', zh: '生成失败' })
    }
    await nextTick()

    expect(wrapper.findComponent(CostumeDetail).exists()).toBe(false)
    expect(wrapper.findComponent(GenStateFailed).exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(gen.result).toBe(result)
    expect(gen.image).toBe(source.img)
    const back = wrapper.getComponent(UIError).props('back')
    expect(back).toBeTypeOf('function')
    await back?.()
    await nextTick()
    expect(wrapper.getComponent(CostumeDetail).props('costume')).toBe(result)
  })
})
