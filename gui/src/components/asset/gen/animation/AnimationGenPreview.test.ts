import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, shallowReactive } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { DefaultException } from '@/utils/exception'
import { mockFile } from '@/models/common/test'
import { Animation } from '@/models/spx/animation'
import { Costume } from '@/models/spx/costume'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import { Phase } from '@/models/spx/gen/common'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { UIError } from '@/components/ui'
import AnimationDetail from '@/components/editor/sprite/AnimationDetail.vue'
import GenLoading from '../common/GenLoading.vue'
import GenStateFailed from '../common/GenStateFailed.vue'
import AnimationGenPreview from './AnimationGenPreview.vue'
import AnimationVideoPreview from './AnimationVideoPreview.vue'

vi.mock('../..', () => ({ useRenameAnimationGen: () => vi.fn() }))

vi.mock('@/components/ui/message/UIMessageProvider.vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/message/UIMessageProvider.vue')>()),
  useMessage: () => ({ error: vi.fn(), success: vi.fn() })
}))

function setup() {
  const i18n = createI18n({ lang: 'zh' })
  const project = new SpxProject()
  const sprite = new Sprite('Cat')
  const result = new Animation('walk')
  result.setCostumes([new Costume('walk-frame', mockFile('walk.png'))])
  sprite.addAnimation(result)
  project.addSprite(sprite)
  const generatePhase = shallowReactive(new Phase<ReturnType<typeof mockFile>>({ en: 'generate', zh: '生成' }))
  const finishPhase = shallowReactive(new Phase<Animation>({ en: 'save', zh: '保存' }, { status: 'finished', result }))
  const gen = new AnimationGen(i18n, sprite, project, {
    settings: { name: 'walk' },
    generateVideoPhase: generatePhase,
    finishPhase
  })
  const pending = ref(false)
  vi.spyOn(gen, 'hasPendingVideo', 'get').mockImplementation(() => pending.value)
  const finish = vi.spyOn(gen, 'finish').mockImplementation(async () => {
    const saved = new Animation(result.name, { id: result.id })
    saved.setCostumes([new Costume('edited-frame', mockFile('edited.png'))])
    finishPhase.state = { status: 'finished', result: saved }
    pending.value = false
    return saved
  })
  const host = shallowMount(
    defineComponent(() => () => h(AnimationGenPreview, { gen })),
    {
      global: {
        plugins: [i18n],
        renderStubDefaultSlot: true,
        stubs: {
          AnimationGenPreview: false,
          GenPreview: false,
          UIButton: false,
          PreviewWithCheckerboardBg: false,
          GenStateFailed: false
        },
        directives: { radar: () => {} }
      }
    }
  )
  const wrapper = host.getComponent(AnimationGenPreview)
  onTestFinished(() => {
    host.unmount()
    gen.dispose()
    project.dispose()
  })
  return { wrapper, gen, result, generatePhase, finishPhase, pending, finish }
}

describe('AnimationGenPreview', () => {
  it('does not show generation progress when loading existing video previews', async () => {
    const { wrapper, gen, generatePhase, pending } = setup()
    pending.value = true
    for (const name of ['previous.mp4', 'current.mp4']) {
      const video = mockFile(name)
      gen.setVideo(video)
      generatePhase.state = { status: 'finished', result: video }
      await nextTick()
      expect(wrapper.findComponent(GenLoading).exists()).toBe(false)

      wrapper.getComponent(AnimationVideoPreview).vm.$emit('ready')
      await nextTick()
      expect(wrapper.findComponent(GenLoading).exists()).toBe(false)
    }
  })

  it('shows regeneration progress with an existing draft, then trims and saves the new video', async () => {
    const { wrapper, gen, result, generatePhase, pending, finish } = setup()
    result.setCostumes(Array.from({ length: 4 }, (_, i) => new Costume(`walk-frame-${i}`, mockFile('walk.png'))))
    result.setDuration(0.8)
    expect(wrapper.getComponent(AnimationDetail).props('animation')).toBe(result)
    generatePhase.state = { status: 'running', timeLeft: null }
    await nextTick()
    expect(wrapper.getComponent(GenLoading).text()).toContain('正在生成动画')
    expect(wrapper.getComponent(GenLoading).props('playable')).toBe(true)
    expect(wrapper.getComponent(GenLoading).props('completed')).toBe(false)
    expect(wrapper.findComponent(AnimationDetail).exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(gen.result).toBe(result)

    const video = mockFile('edited.mp4')
    gen.setVideo(video)
    pending.value = true
    generatePhase.state = { status: 'finished', result: video }
    await nextTick()
    const preview = wrapper.getComponent(AnimationVideoPreview)
    expect(preview.props('video')).toBe(video)
    expect(preview.props('framesConfig')).toBeNull()
    expect(preview.props('showControls')).toBe(false)
    const loading = wrapper.getComponent(GenLoading)
    expect(loading.props('visible')).toBe(true)
    expect(loading.props('playable')).toBe(false)
    expect(loading.props('completed')).toBe(true)
    preview.vm.$emit('ready')
    await nextTick()
    expect(loading.props('visible')).toBe(false)
    expect(preview.props('showControls')).toBe(false)
    expect(wrapper.findComponent(GenLoading).exists()).toBe(true)
    loading.vm.$emit('hidden')
    await nextTick()
    expect(wrapper.findComponent(GenLoading).exists()).toBe(false)
    expect(preview.props('showControls')).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
    preview.vm.$emit('update:framesConfig', { startTime: 100, duration: 900, interval: 100 })
    await nextTick()
    expect(gen.framesConfig).toEqual({ startTime: 100, duration: 900, interval: 100 })
    expect(gen.result).toBe(result)
    const save = wrapper.get('button')
    expect(save.text()).toBe('保存动画')
    await save.trigger('click')
    await flushPromises()

    expect(finish).toHaveBeenCalledTimes(1)
    expect(wrapper.getComponent(AnimationDetail).props('animation')).toBe(gen.result)
    expect(gen.result?.id).toBe(result.id)
    expect(gen.result?.costumes[0].img.name).toBe('edited.png')
    expect(result.costumes[0].img.name).toBe('walk.png')
  })

  it('returns to the previous pending video after editing fails without losing the saved animation', async () => {
    const { wrapper, gen, result, generatePhase, pending } = setup()
    const video = mockFile('previous-preview.mp4')
    gen.setVideo(video)
    gen.setFramesConfig({ duration: 1000, interval: 100 })
    pending.value = true
    generatePhase.state = {
      status: 'failed',
      error: new DefaultException({ en: 'Editing failed', zh: '修改失败' })
    }
    await nextTick()

    expect(wrapper.findComponent(GenStateFailed).exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(gen.result).toBe(result)
    const back = wrapper.getComponent(UIError).props('back')
    expect(back).toBeTypeOf('function')
    await back?.()
    await nextTick()

    expect(gen.generateVideoState.status).toBe('initial')
    expect(wrapper.findComponent(GenStateFailed).exists()).toBe(false)
    expect(wrapper.getComponent(AnimationVideoPreview).props('video')).toBe(video)
    expect(wrapper.get('button').text()).toBe('保存动画')
    expect(gen.framesConfig).toEqual({ duration: 1000, interval: 100 })
    expect(gen.hasPendingVideo).toBe(true)
    expect(gen.result).toBe(result)
  })

  it('returns to the saved animation after editing fails without a pending video', async () => {
    const { wrapper, gen, result, generatePhase } = setup()
    generatePhase.state = {
      status: 'failed',
      error: new DefaultException({ en: 'Editing failed', zh: '修改失败' })
    }
    await nextTick()
    const back = wrapper.getComponent(UIError).props('back')
    expect(back).toBeTypeOf('function')
    await back?.()
    await nextTick()

    expect(wrapper.findComponent(GenStateFailed).exists()).toBe(false)
    expect(wrapper.getComponent(AnimationDetail).props('animation')).toBe(result)
    expect(gen.video).toBeNull()
    expect(gen.result).toBe(result)
  })

  it('returns to the pending video after a save error without losing the previous animation', async () => {
    const { wrapper, gen, result, finishPhase, pending } = setup()
    gen.setVideo(mockFile('edited.mp4'))
    gen.setFramesConfig({ duration: 1000, interval: 100 })
    pending.value = true
    finishPhase.state = {
      status: 'failed',
      error: new DefaultException({ en: 'Saving failed', zh: '保存失败' })
    }
    await nextTick()
    expect(gen.result).toBe(result)
    await wrapper.getComponent(UIError).props('back')?.()
    await nextTick()

    expect(wrapper.findComponent(UIError).exists()).toBe(false)
    expect(wrapper.findComponent(AnimationVideoPreview).exists()).toBe(true)
    expect(wrapper.get('button').text()).toBe('保存动画')
    expect(gen.result).toBe(result)
  })
})
