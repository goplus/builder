import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SoundGenModal from './SoundGenModal.vue'
import SoundTakeCard from './SoundTakeCard.vue'
import SoundWaveform from './SoundWaveform.vue'
import { PEAK_COUNT, type Sample } from './samples'

const mockLoadSample = vi.fn()
const mockConfirm = vi.fn()
const mockCreateSound = vi.fn()
const mockRegisterPlayer = vi.fn()

vi.mock('./samples', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./samples')>()
  return {
    ...actual,
    loadSample: (...args: unknown[]) => mockLoadSample(...args)
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
      props: { type: { type: String, default: '' } },
      setup(props) {
        return () => h('span', { 'data-test': 'icon', 'data-type': props.type })
      }
    }),
    useConfirmDialog: () => mockConfirm
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
            'data-loading': String(props.loading),
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
    peaks: Array.from({ length: 48 }, (_, i) => (i + 1) / 48),
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

describe('SoundWaveform', () => {
  it('supports keyboard seeking', async () => {
    const wrapper = mount(SoundWaveform, {
      props: {
        peaks: Array(48).fill(0.5),
        progress: 0.25,
        label: '森林探险 1'
      },
      global: {
        directives: { radar: () => undefined }
      }
    })

    const slider = wrapper.get('[role="slider"]')
    await slider.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('seek')?.[0]?.[0]).toBeCloseTo(0.3, 5)

    await slider.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('seek')?.[1]?.[0]).toBeCloseTo(0.2, 5)
  })
})

describe('SoundTakeCard', () => {
  it('renders restrained internal loading state with orbital ring, shimmer waveform, and placeholder duration matching ready geometry', () => {
    const loadingWrapper = mount(SoundTakeCard, {
      props: {
        name: '阳光草地跑酷 1',
        sample: null,
        index: 0,
        play: vi.fn().mockResolvedValue(undefined)
      },
      global: {
        directives: { radar: () => undefined }
      }
    })

    expect(loadingWrapper.find('.is-loading').exists()).toBe(true)
    expect(loadingWrapper.find('.loading-ring-arc').exists()).toBe(true)
    expect(loadingWrapper.find('[data-test="icon"][data-type="play"]').exists()).toBe(true)
    expect(loadingWrapper.find('[data-test="play-control"]').exists()).toBe(false)
    expect(loadingWrapper.text()).toContain('--:--')
    expect(loadingWrapper.find('.skeleton-shimmer').exists()).toBe(true)
    const skeletonBars = loadingWrapper.findAll('.skeleton-bar')
    expect(skeletonBars).toHaveLength(PEAK_COUNT)
    expect(skeletonBars[0].element.parentElement?.className).toContain('gap-[2px]')

    const readyWrapper = mount(SoundTakeCard, {
      props: {
        name: '阳光草地跑酷 1',
        sample: makeSample(),
        index: 0,
        play: vi.fn().mockResolvedValue(undefined)
      },
      global: {
        directives: { radar: () => undefined }
      }
    })

    expect(readyWrapper.find('.is-loading').exists()).toBe(false)
    expect(readyWrapper.find('.loading-ring').exists()).toBe(false)
    expect(readyWrapper.find('.skeleton-shimmer').exists()).toBe(false)
    const waveformTrack = readyWrapper.find('.waveform-track > div')
    expect(waveformTrack.classes()).toContain('gap-[2px]')
    expect(waveformTrack.findAll('.waveform-bar')).toHaveLength(PEAK_COUNT)
    expect(readyWrapper.get('[data-test="play-control"]').attributes('data-loading')).toBe('false')
  })
})

describe('SoundGenModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockLoadSample.mockReset()
    mockConfirm.mockReset()
    mockCreateSound.mockReset()
    mockRegisterPlayer.mockReset()
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

  it('generates 4 takes, allows selecting, and emits resolved sound on adopt', async () => {
    mockLoadSample.mockImplementation(async (_kind, _version, seconds) => makeSample(seconds))
    const fakeSound = { id: 'sound-1', name: '森林探险 2' }
    mockCreateSound.mockResolvedValue(fakeSound)

    const wrapper = mountModal()
    const submitBtn = wrapper.findAll('button').find((b) => b.text() === '生成')!
    expect(submitBtn.attributes('disabled')).toBeUndefined()

    await submitBtn.trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(mockLoadSample).toHaveBeenCalledTimes(4)
    const takeCards = wrapper.findAll('.sound-take-card')
    expect(takeCards).toHaveLength(4)

    await takeCards[1].trigger('click')
    expect(wrapper.find('[data-test="corner-icon"]').exists()).toBe(true)

    const useBtn = wrapper.findAll('button').find((b) => b.text() === '采用')!
    expect(useBtn.attributes('disabled')).toBeUndefined()
    await useBtn.trigger('click')
    await flushPromises()

    expect(mockCreateSound).toHaveBeenCalledTimes(1)
    expect(mockCreateSound.mock.calls[0][0]).toBe('森林探险 2')
    expect(wrapper.emitted('resolved')).toEqual([[fakeSound]])
  })

  it('keeps independent drafts and parameter options when switching between music and sound effect', async () => {
    const wrapper = mountModal()
    const dropdowns = wrapper.findAll('[data-test="param-dropdown"]')
    expect(dropdowns).toHaveLength(3)

    // Pick a music genre in music draft
    await dropdowns[1].get('button[aria-label="电子合成"]').trigger('click')
    await flushPromises()
    expect(dropdowns[1].text()).toContain('电子合成')

    // Switch to sound effect via Sound type popover option
    await dropdowns[0].get('button[aria-label="音效"]').trigger('click')
    await flushPromises()

    const textarea = wrapper.get('textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toContain('金币')

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

    // Switch to speech/TTS and verify voice timbre and speed options
    await wrapper.findAll('[data-test="param-dropdown"]')[0].get('button[aria-label="配音"]').trigger('click')
    await flushPromises()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toContain('宝藏')

    const voiceLabels = wrapper
      .findAll('[data-test="param-dropdown"]')[1]
      .findAll('.ui-block-item span')
      .map((el) => el.text())
    expect(voiceLabels).toContain('温暖旁白')

    const speedLabels = wrapper
      .findAll('[data-test="param-dropdown"]')[2]
      .findAll('.ui-block-item')
      .map((el) => el.text())
    expect(speedLabels).toEqual(['0.8x 慢速', '1.0x 正常', '1.25x 较快'])

    // Switch back to music and verify prompt and selected genre are preserved
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
    // Auditioning should not select the style
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
