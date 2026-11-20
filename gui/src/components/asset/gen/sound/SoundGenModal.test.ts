import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SoundGenModal from './SoundGenModal.vue'
import SoundSquareItem from './SoundSquareItem.vue'
import type { Sample } from './samples'

const mockLoadSample = vi.fn()
const mockConfirm = vi.fn()
const mockInvokeModal = vi.fn()
const mockCreateSound = vi.fn()
const mockRegisterPlayer = vi.fn()
const mockDecodeAudioData = vi.fn()
const mockTrimAndApplyGain = vi.fn()

vi.mock('@lottiefiles/dotlottie-vue', () => ({
  DotLottieVue: defineComponent({
    props: { src: { type: String, default: '' } },
    setup(props) {
      return () => h('div', { 'data-test': 'dotlottie', 'data-src': props.src })
    }
  })
}))

vi.mock('./samples', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./samples')>()
  return {
    ...actual,
    loadSample: (...args: unknown[]) => mockLoadSample(...args)
  }
})

vi.mock('@/utils/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/audio')>()
  return {
    ...actual,
    getAudioContext: () => ({
      decodeAudioData: (...args: unknown[]) => mockDecodeAudioData(...args)
    }),
    trimAndApplyGainToWavBlob: (...args: unknown[]) => mockTrimAndApplyGain(...args)
  }
})

vi.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    t: (msg: { zh?: string; en?: string }) => msg.zh ?? msg.en ?? ''
  })
}))

vi.mock('@/utils/exception', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./samples')>()
  return {
    ...actual,
    useMessageHandle: (fn: (...args: unknown[]) => Promise<unknown>) => ({
      fn,
      isLoading: ref(false)
    })
  }
})

vi.mock('@/utils/player-registry', () => ({
  registerPlayer: (...args: unknown[]) => {
    mockRegisterPlayer(...args)
    return {
      onStart: vi.fn(),
      onStopped: vi.fn()
    }
  }
}))

vi.mock('@/models/spx/sound', () => ({
  Sound: {
    create: (...args: unknown[]) => mockCreateSound(...args)
  }
}))

vi.mock('@/components/ui/UIDropdown.vue', () => ({
  useDropdown: () => ({ setVisible: vi.fn() })
}))

vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui')>()
  const UIModalStub = defineComponent({
    props: { visible: Boolean },
    emits: ['update:visible'],
    setup(props, { slots }) {
      return () => (props.visible ? h('div', { 'data-test': 'modal' }, slots.default?.()) : null)
    }
  })

  return {
    ...actual,
    UIModal: UIModalStub,
    UIDropdownWithTooltip: defineComponent({
      setup(_, { slots }) {
        return () => h('div', { 'data-test': 'param-dropdown' }, [slots.trigger?.(), slots['dropdown-content']?.()])
      }
    }),
    UICornerIcon: defineComponent({
      props: { type: { type: String, default: '' } },
      setup(props) {
        return () => h('span', { 'data-test': 'corner-icon', 'data-type': props.type })
      }
    }),
    UIIcon: defineComponent({
      props: { type: { type: String, default: '' }, title: { type: String, default: '' } },
      emits: ['click'],
      setup(props, { emit }) {
        return () =>
          h('button', {
            type: 'button',
            'data-test': 'icon',
            'data-type': props.type,
            onClick: (e: MouseEvent) => emit('click', e)
          })
      }
    }),
    useConfirmDialog: () => mockConfirm,
    useModal: () => mockInvokeModal
  }
})

vi.mock('@/components/editor/common/PlayControl.vue', () => ({
  default: defineComponent({
    props: {
      playing: { type: Object, default: null },
      loading: Boolean,
      size: { type: String, default: 'medium' },
      progressInterval: { type: Number, default: 0.2 },
      playHandler: { type: Function, required: true }
    },
    emits: ['stop'],
    setup(props, { emit }) {
      return () =>
        h(
          'button',
          {
            type: 'button',
            'data-test': 'play-control',
            'data-size': props.size,
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              if (props.playing != null) emit('stop')
              else (props.playHandler as () => void)()
            }
          },
          props.playing != null ? 'stop' : 'play'
        )
    }
  })
}))

vi.mock('@/components/editor/stage/sound/waveform', () => ({
  WaveformPlayer: defineComponent({
    name: 'WaveformPlayer',
    props: {
      audioSrc: { type: String, default: '' },
      range: { type: Object, required: true },
      gain: { type: Number, required: true }
    },
    emits: ['play', 'stop', 'progress', 'update:range'],
    setup(props, { emit, expose }) {
      expose({
        play: async () => emit('play'),
        stop: () => emit('stop')
      })
      return () =>
        h('div', {
          'data-test': 'waveform-player',
          'data-src': props.audioSrc,
          'data-left': String(props.range.left),
          'data-right': String(props.range.right),
          'data-gain': String(props.gain)
        })
    }
  })
}))

vi.mock('@/components/editor/stage/sound/VolumeSlider.vue', () => ({
  default: defineComponent({
    props: {
      value: { type: Number, required: true }
    },
    emits: ['update:value'],
    setup(props, { emit }) {
      return () =>
        h('input', {
          'data-test': 'volume-slider',
          value: props.value,
          onInput: (e: Event) => emit('update:value', Number((e.target as HTMLInputElement).value))
        })
    }
  })
}))

vi.mock('../common/SettingsInput.vue', () => {
  const settingsInputCtxKey = Symbol('settingsInputCtxKey')
  return {
    settingsInputCtxKey,
    default: defineComponent({
      props: {
        description: { type: String, required: true },
        disabled: Boolean,
        enrichable: Boolean
      },
      emits: ['update:description'],
      setup(props, { slots, emit }) {
        return () =>
          h('div', { 'data-test': 'settings-input' }, [
            h('textarea', {
              value: props.description,
              disabled: props.disabled,
              onInput: (e: Event) => emit('update:description', (e.target as HTMLTextAreaElement).value)
            }),
            slots.extra?.(),
            slots.submit?.()
          ])
      }
    })
  }
})

function makeSample(seconds = 15): Sample {
  return {
    blob: new Blob(['wav'], { type: 'audio/wav' }),
    seconds
  }
}

function mountModal() {
  return mount(SoundGenModal, {
    props: { visible: true },
    global: {
      mocks: {
        $t: (msg: { zh?: string; en?: string }) => msg.zh ?? msg.en ?? ''
      },
      directives: {
        radar: () => undefined
      }
    }
  })
}

describe('SoundSquareItem', () => {
  it('renders GenLoading cover while generating and UISoundItem / UIEditorSoundItem layouts when ready', async () => {
    const wrapper = mount(SoundSquareItem, {
      props: {
        name: '阳光草地跑酷 1',
        sample: null,
        play: vi.fn().mockResolvedValue(undefined)
      },
      global: {
        directives: { radar: () => undefined }
      }
    })

    expect(wrapper.find('[data-test="dotlottie"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="play-control"]').exists()).toBe(false)

    await wrapper.setProps({ sample: makeSample(15) })

    expect(wrapper.find('[data-test="dotlottie"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="play-control"]').attributes('data-size')).toBe('large')
    expect(wrapper.text()).toContain('15.0s')

    await wrapper.setProps({ compact: true })
    expect(wrapper.get('[data-test="play-control"]').attributes('data-size')).toBe('medium')
  })
})

describe('SoundGenModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockLoadSample.mockReset()
    mockConfirm.mockReset()
    mockInvokeModal.mockReset()
    mockCreateSound.mockReset()
    mockRegisterPlayer.mockReset()
    mockDecodeAudioData.mockReset()
    mockTrimAndApplyGain.mockReset()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-audio')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.stubGlobal(
      'Audio',
      vi.fn(function () {
        return {
          play: vi.fn().mockResolvedValue(undefined),
          pause: vi.fn(),
          paused: false,
          ended: false,
          currentTime: 0,
          duration: 2.2,
          ontimeupdate: null,
          onended: null
        }
      })
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('generates 4 square candidates, opens SoundGenPreview on selection, and emits resolved sound on adopt', async () => {
    mockLoadSample.mockImplementation(async (_kind, _version, seconds) => makeSample(seconds))
    const fakeSound = { id: 'sound-1', name: '森林探险 2' }
    mockCreateSound.mockResolvedValue(fakeSound)

    const wrapper = mountModal()
    const submitBtn = wrapper.findAll('button').find((b) => b.text() === '生成')!
    await submitBtn.trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(mockLoadSample).toHaveBeenCalledTimes(4)
    const candidates = wrapper.findAllComponents(SoundSquareItem)
    expect(candidates).toHaveLength(4)

    await candidates[1].trigger('click')
    await flushPromises()

    expect(wrapper.get('.layout-with-preview').classes()).toContain('has-preview')
    expect(wrapper.find('[data-test="waveform-player"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="corner-icon"]').exists()).toBe(true)

    const useBtn = wrapper.findAll('button').find((b) => b.text() === '采用')!
    expect(useBtn.attributes('disabled')).toBeUndefined()
    await useBtn.trigger('click')
    await flushPromises()

    expect(mockTrimAndApplyGain).not.toHaveBeenCalled()
    expect(mockCreateSound).toHaveBeenCalledTimes(1)
    expect(mockCreateSound.mock.calls[0][0]).toBe('森林探险 2')
    expect(wrapper.emitted('resolved')).toEqual([[fakeSound]])
  })

  it('supports trimming, volume adjustment, reset, rename, and exports edited WAV on adopt', async () => {
    mockLoadSample.mockImplementation(async (_kind, _version, seconds) => makeSample(seconds))
    const fakeAudioBuffer = { duration: 15 }
    const trimmedBlob = new Blob(['trimmed-wav'], { type: 'audio/wav' })
    mockDecodeAudioData.mockResolvedValue(fakeAudioBuffer)
    mockTrimAndApplyGain.mockResolvedValue(trimmedBlob)
    mockInvokeModal.mockImplementation(
      async ({ target }: { target: { applyName: (name: string) => Promise<void> } }) => {
        await target.applyName('欢快木琴主题')
      }
    )
    const fakeSound = { id: 'sound-2', name: '欢快木琴主题' }
    mockCreateSound.mockResolvedValue(fakeSound)

    const wrapper = mountModal()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '生成')!
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    const candidates = wrapper.findAllComponents(SoundSquareItem)
    await candidates[0].trigger('click')
    await flushPromises()

    // Rename via edit icon
    const editIconBtn = wrapper.findAll('[data-test="icon"]').find((el) => el.attributes('data-type') === 'edit')!
    await editIconBtn.trigger('click')
    await flushPromises()
    expect(mockInvokeModal).toHaveBeenCalledTimes(1)
    expect(candidates[0].text()).toContain('欢快木琴主题')

    // Trim audio range to [0.2, 0.7] -> 7.5s and verify collapsed-range clamping + reset
    const waveformPlayer = wrapper.findComponent({ name: 'WaveformPlayer' })
    waveformPlayer.vm.$emit('update:range', { left: 0.2, right: 0.7 })
    await flushPromises()
    expect(wrapper.text()).toContain('7.5s')

    waveformPlayer.vm.$emit('update:range', { left: 0.5, right: 0.5 })
    await flushPromises()
    const clampedLeft = Number(wrapper.get('[data-test="waveform-player"]').attributes('data-left'))
    const clampedRight = Number(wrapper.get('[data-test="waveform-player"]').attributes('data-right'))
    expect(clampedRight - clampedLeft).toBeGreaterThanOrEqual(0.02)

    const resetBtn = wrapper.findAll('button').find((b) => b.text() === '重置')!
    await resetBtn.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('15.0s')

    // Apply final trim + gain and adopt
    waveformPlayer.vm.$emit('update:range', { left: 0.1, right: 0.6 })
    const volumeSlider = wrapper.get('[data-test="volume-slider"]')
    ;(volumeSlider.element as HTMLInputElement).value = '1.5'
    await volumeSlider.trigger('input')
    await flushPromises()

    const useBtn = wrapper.findAll('button').find((b) => b.text() === '采用')!
    await useBtn.trigger('click')
    await flushPromises()

    expect(mockDecodeAudioData).toHaveBeenCalledTimes(1)
    expect(mockTrimAndApplyGain).toHaveBeenCalledWith(fakeAudioBuffer, 0.1, 0.6, 1.5)
    expect(mockCreateSound).toHaveBeenCalledTimes(1)
    expect(mockCreateSound.mock.calls[0][0]).toBe('欢快木琴主题')
    expect(wrapper.emitted('resolved')).toEqual([[fakeSound]])
  })

  it('keeps preview panel open across regeneration and coordinates preview vs direct playback', async () => {
    let resolveNextSample: ((sample: Sample) => void) | null = null
    mockLoadSample.mockImplementation(async (_kind, _version, seconds) => makeSample(seconds))

    const wrapper = mountModal()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '生成')!
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    const candidates = wrapper.findAllComponents(SoundSquareItem)
    await candidates[0].trigger('click')
    await flushPromises()
    expect(wrapper.get('.layout-with-preview').classes()).toContain('has-preview')

    // Start preview playback on candidate 0, then click play directly on candidate 1
    await candidates[0].get('[data-test="play-control"]').trigger('click')
    await flushPromises()
    expect(candidates[0].get('[data-test="play-control"]').text()).toBe('stop')

    await candidates[1].get('[data-test="play-control"]').trigger('click')
    await flushPromises()
    expect(candidates[0].get('[data-test="play-control"]').text()).toBe('play')
    expect(candidates[1].get('[data-test="play-control"]').text()).toBe('stop')

    // Regenerate while preview is open: has-preview stays true and shows loading, then selection hint
    mockLoadSample.mockImplementationOnce(
      () =>
        new Promise<Sample>((resolve) => {
          resolveNextSample = resolve
        })
    )
    expect(wrapper.get('section p').text()).toContain('选择你最喜欢的一段音乐')
    const regenBtn = wrapper.findAll('button').find((b) => b.text() === '重新生成')!
    await regenBtn.trigger('click')
    await flushPromises()
    expect(wrapper.get('.layout-with-preview').classes()).toContain('has-preview')
    expect(wrapper.text()).toContain('正在生成音乐...')

    resolveNextSample!(makeSample(15))
    await vi.runAllTimersAsync()
    await flushPromises()
    expect(wrapper.get('.layout-with-preview').classes()).toContain('has-preview')
    expect(wrapper.text()).toContain('请在左侧选择一段声音进行预览和裁剪')
  })

  it('keeps independent drafts and parameter options when switching between music, effect, and speech', async () => {
    const wrapper = mountModal()
    const dropdowns = wrapper.findAll('[data-test="param-dropdown"]')
    expect(dropdowns).toHaveLength(3)

    await dropdowns[1].get('button[aria-label="电子合成"]').trigger('click')
    await flushPromises()
    expect(dropdowns[1].text()).toContain('电子合成')

    await dropdowns[0].get('button[aria-label="音效"]').trigger('click')
    await flushPromises()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toContain('金币')

    const styleLabels = wrapper
      .findAll('[data-test="param-dropdown"]')[1]
      .findAll('.ui-block-item span')
      .map((el) => el.text())
    expect(styleLabels).toContain('卡通趣味')

    const durationLabels = wrapper
      .findAll('[data-test="param-dropdown"]')[2]
      .findAll('.ui-block-item')
      .map((el) => el.text())
    expect(durationLabels).toEqual(['1 秒', '3 秒', '5 秒'])

    await wrapper.findAll('[data-test="param-dropdown"]')[0].get('button[aria-label="配音"]').trigger('click')
    await flushPromises()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toContain('宝藏')

    await wrapper.findAll('[data-test="param-dropdown"]')[0].get('button[aria-label="音乐"]').trigger('click')
    await flushPromises()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toContain('森林探险')
    expect(wrapper.findAll('[data-test="param-dropdown"]')[1].text()).toContain('电子合成')
  })

  it('allows auditioning style previews without changing selection', async () => {
    const wrapper = mountModal()
    const styleDropdown = wrapper.findAll('[data-test="param-dropdown"]')[1]
    const triggerButton = styleDropdown.get('button')
    expect(triggerButton.text()).toBe('曲风')

    const playButtons = styleDropdown.findAll('[data-test="play-control"]')
    expect(playButtons).toHaveLength(6)

    await playButtons[1].trigger('click')
    await flushPromises()
    expect(playButtons[1].text()).toBe('stop')
    expect(triggerButton.text()).toBe('曲风')

    await playButtons[1].trigger('click')
    await flushPromises()
    expect(playButtons[1].text()).toBe('play')
  })

  it('prompts confirmation and aborts in-flight generation when closing', async () => {
    let aborted = false
    mockConfirm.mockResolvedValue(undefined)
    mockLoadSample.mockImplementation(
      (_kind: string, _version: number, _seconds: number, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            aborted = true
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
    )

    const wrapper = mountModal()
    const submitBtn = wrapper.findAll('button').find((b) => b.text() === '生成')!
    await submitBtn.trigger('click')
    await flushPromises()

    await wrapper.get('.close').trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalledTimes(1)
    expect(aborted).toBe(true)
    expect(wrapper.emitted('cancelled')).toEqual([[]])
  })
})
