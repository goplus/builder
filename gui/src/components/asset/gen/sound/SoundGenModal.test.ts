import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpxProject } from '@/models/spx/project'
import SoundGenModal from './SoundGenModal.vue'
import SoundTakeCard from './SoundTakeCard.vue'
import SoundWaveform from './SoundWaveform.vue'
import { PEAK_COUNT, type Sample } from './samples'

const mockLoadSample = vi.fn()
const mockConfirm = vi.fn()
const mockCreateSound = vi.fn()
const mockRegisterPlayer = vi.fn()

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

vi.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    t: (msg: { zh?: string; en?: string }) => msg.zh ?? msg.en ?? ''
  })
}))

vi.mock('@/utils/exception', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/exception')>()
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
    peaks: Array.from({ length: PEAK_COUNT }, (_, i) => (i + 1) / PEAK_COUNT),
    seconds
  }
}

function mountModal(project: SpxProject | null = null) {
  return mount(SoundGenModal, {
    props: { visible: true, project },
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
  it('renders integer-width bars and supports keyboard seeking', async () => {
    const wrapper = mount(SoundWaveform, {
      props: {
        peaks: Array(PEAK_COUNT).fill(0.5),
        progress: 0.25,
        label: '森林探险 1'
      },
      global: {
        directives: { radar: () => undefined }
      }
    })

    const baseBars = wrapper.findAll('div[aria-hidden="true"]')[0].findAll('i')
    expect(baseBars).toHaveLength(53)
    expect(baseBars[0].classes()).toContain('w-0.5')
    expect(baseBars[0].classes()).toContain('flex-none')

    const slider = wrapper.get('[role="slider"]')
    await slider.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('seek')?.[0]?.[0]).toBeCloseTo(0.3, 5)

    await slider.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('seek')?.[1]?.[0]).toBeCloseTo(0.2, 5)
  })
})

describe('SoundTakeCard', () => {
  it('renders GenLoading cover while generating and transitions to PlayControl and SoundWaveform when ready', async () => {
    const wrapper = mount(SoundTakeCard, {
      props: {
        name: '森林探险 1',
        sample: null,
        play: vi.fn().mockResolvedValue(undefined)
      },
      global: {
        directives: { radar: () => undefined }
      }
    })

    expect(wrapper.find('[data-test="dotlottie"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="play-control"]').exists()).toBe(false)
    expect(wrapper.attributes('role')).toBeUndefined()

    await wrapper.setProps({ sample: makeSample(15) })

    expect(wrapper.find('[data-test="dotlottie"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="play-control"]').attributes('data-size')).toBe('medium')
    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.text()).toContain('0:15')
    expect(wrapper.findComponent(SoundWaveform).exists()).toBe(true)

    await wrapper.setProps({ playing: true, progress: 0.4, active: true })
    expect(wrapper.text()).toContain('0:06 / 0:15')
    expect(wrapper.find('[data-test="corner-icon"]').exists()).toBe(true)
  })
})

describe('SoundGenModal', () => {
  let audioInstances: Array<{
    play: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    paused: boolean
    ended: boolean
    currentTime: number
    duration: number
    ontimeupdate: (() => void) | null
    onended: (() => void) | null
  }> = []

  beforeEach(() => {
    vi.useFakeTimers()
    audioInstances = []
    mockLoadSample.mockReset()
    mockConfirm.mockReset()
    mockCreateSound.mockReset()
    mockRegisterPlayer.mockReset()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-audio')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.stubGlobal(
      'Audio',
      vi.fn(function () {
        const instance = {
          play: vi.fn().mockResolvedValue(undefined),
          pause: vi.fn(),
          paused: false,
          ended: false,
          currentTime: 0,
          duration: 15,
          ontimeupdate: null,
          onended: null
        }
        audioInstances.push(instance)
        return instance
      })
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('progressively generates 4 horizontal candidates, seeks playback, and deduplicates sound name on adopt', async () => {
    let resolveFirst: ((sample: Sample) => void) | null = null
    mockLoadSample
      .mockImplementationOnce(
        () =>
          new Promise<Sample>((resolve) => {
            resolveFirst = resolve
          })
      )
      .mockImplementation(async (_kind, _version, seconds) => makeSample(seconds))

    const fakeProject = {
      sounds: [{ name: '森林探险 2' }]
    } as unknown as SpxProject
    const fakeSound = { id: 'sound-1', name: '森林探险 3' }
    mockCreateSound.mockResolvedValue(fakeSound)

    const wrapper = mountModal(fakeProject)
    expect(wrapper.get('.layout-with-preview').classes()).not.toContain('has-preview')

    const submitBtn = wrapper.findAll('button').find((b) => b.text() === '生成')!
    await submitBtn.trigger('click')
    await flushPromises()

    // While in flight: 4 loading cards with GenLoading cover and loading tip
    const cardsWhileLoading = wrapper.findAllComponents(SoundTakeCard)
    expect(cardsWhileLoading).toHaveLength(4)
    expect(wrapper.findAll('[data-test="dotlottie"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('正在生成音乐...')

    resolveFirst!(makeSample(15))
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(mockLoadSample).toHaveBeenCalledTimes(4)
    expect(wrapper.findAll('[data-test="dotlottie"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('选择你最喜欢的一段音乐，或者重新生成。')

    const cards = wrapper.findAllComponents(SoundTakeCard)
    await cards[1].trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="corner-icon"]').exists()).toBe(true)

    // Seek via waveform starts playback at target timestamp and seeks in-place when already playing
    cards[1].findComponent(SoundWaveform).vm.$emit('seek', 0.5)
    await flushPromises()
    expect(audioInstances).toHaveLength(1)
    expect(audioInstances[0].currentTime).toBeCloseTo(7.5, 5)

    cards[1].findComponent(SoundWaveform).vm.$emit('seek', 0.8)
    await flushPromises()
    expect(audioInstances).toHaveLength(1)
    expect(audioInstances[0].currentTime).toBeCloseTo(12, 5)

    const useBtn = wrapper.findAll('button').find((b) => b.text() === '采用')!
    expect(useBtn.attributes('disabled')).toBeUndefined()
    await useBtn.trigger('click')
    await flushPromises()

    expect(mockCreateSound).toHaveBeenCalledTimes(1)
    // Since '森林探险 2' already exists in project.sounds, ensureValidSoundName increments to '森林探险 3'
    expect(mockCreateSound.mock.calls[0][0]).toBe('森林探险 3')
    expect(wrapper.emitted('resolved')).toEqual([[fakeSound]])
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
