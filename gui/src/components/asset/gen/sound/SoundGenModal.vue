<script lang="ts">
import type { LocaleMessage } from '@/utils/i18n'
import type { SoundKind } from './samples'
import type { SoundParamOption } from './SoundParamSelector.vue'

const SOUND_OPTIONS: Record<
  SoundKind,
  {
    label: LocaleMessage
    example: LocaleMessage
    name: LocaleMessage
    loadingTip: LocaleMessage
    selectionTip: LocaleMessage
    timingName: LocaleMessage
    timingTips: LocaleMessage
    defaultTiming: number
    timingOptions: Array<SoundParamOption<number>>
    styleName: LocaleMessage
    styleTips: LocaleMessage
    styles: Array<SoundParamOption<string>>
  }
> = {
  music: {
    label: { zh: '音乐', en: 'Music' },
    example: {
      zh: '给森林探险配一段轻快的音乐，用木琴演奏主旋律。',
      en: 'Playful music for a forest adventure, with the melody played on a xylophone.'
    },
    name: { zh: '森林探险', en: 'forest adventure' },
    loadingTip: { zh: '正在生成音乐...', en: 'Generating music...' },
    selectionTip: {
      zh: '选择你最喜欢的一段音乐，或者重新生成。',
      en: 'Select the music you like the most, or generate new ones.'
    },
    timingName: { zh: '时长', en: 'Duration' },
    timingTips: { zh: '请选择想要生成的声音时长', en: 'Please select the sound duration you want to generate' },
    defaultTiming: 15,
    timingOptions: [15, 30, 60].map((s) => ({ value: s, label: { zh: `${s} 秒`, en: `${s}s` } })),
    styleName: { zh: '曲风', en: 'Genre' },
    styleTips: { zh: '请选择您想要生成的音乐曲风', en: 'Please select the music genre you want to generate' },
    styles: [
      { value: 'pop', label: { zh: '轻快流行', en: 'Pop' } },
      { value: 'electronic', label: { zh: '电子合成', en: 'Electronic' } },
      { value: 'orchestral', label: { zh: '管弦配乐', en: 'Orchestral' } },
      { value: 'chiptune', label: { zh: '像素 8-bit', en: 'Chiptune' } },
      { value: 'ambient', label: { zh: '氛围环境', en: 'Ambient' } },
      { value: 'rock', label: { zh: '活力摇滚', en: 'Rock' } }
    ]
  },
  effect: {
    label: { zh: '音效', en: 'Sound effect' },
    example: {
      zh: '捡到金币时，响起一串由低到高的叮咚声。',
      en: 'A bright chime that rises in pitch when you pick up a coin.'
    },
    name: { zh: '拾取金币', en: 'coin pickup' },
    loadingTip: { zh: '正在生成音效...', en: 'Generating sound effects...' },
    selectionTip: {
      zh: '选择你最喜欢的一个音效，或者重新生成。',
      en: 'Select the sound effect you like the most, or generate new ones.'
    },
    timingName: { zh: '时长', en: 'Duration' },
    timingTips: { zh: '请选择想要生成的声音时长', en: 'Please select the sound duration you want to generate' },
    defaultTiming: 1,
    timingOptions: [1, 3, 5].map((s) => ({ value: s, label: { zh: `${s} 秒`, en: `${s}s` } })),
    styleName: { zh: '风格', en: 'Style' },
    styleTips: { zh: '请选择您想要生成的音效风格', en: 'Please select the sound effect style you want to generate' },
    styles: [
      { value: 'cartoon', label: { zh: '卡通趣味', en: 'Cartoon' } },
      { value: 'retro', label: { zh: '像素复古', en: 'Retro' } },
      { value: 'scifi', label: { zh: '科幻电子', en: 'Sci-Fi' } },
      { value: 'realistic', label: { zh: '写实拟真', en: 'Realistic' } },
      { value: 'ui', label: { zh: '界面交互', en: 'UI' } }
    ]
  },
  speech: {
    label: { zh: '配音', en: 'Voice' },
    example: {
      zh: '勇敢的小松鼠，准备好一起去森林里寻找宝藏了吗！',
      en: 'Brave little squirrel, are you ready to search the forest for treasure!'
    },
    name: { zh: '角色配音', en: 'character voice' },
    loadingTip: { zh: '正在生成配音...', en: 'Generating voice...' },
    selectionTip: {
      zh: '选择你最喜欢的一段配音，或者重新生成。',
      en: 'Select the voice take you like the most, or generate new ones.'
    },
    timingName: { zh: '语速', en: 'Speed' },
    timingTips: { zh: '请选择您想要生成的配音语速', en: 'Please select the speech speed you want to generate' },
    defaultTiming: 1,
    timingOptions: [
      { value: 0.8, label: { zh: '0.8x 慢速', en: '0.8x Slow' } },
      { value: 1, label: { zh: '1.0x 正常', en: '1.0x Normal' } },
      { value: 1.25, label: { zh: '1.25x 较快', en: '1.25x Fast' } }
    ],
    styleName: { zh: '音色', en: 'Voice' },
    styleTips: { zh: '请选择您想要生成的配音音色', en: 'Please select the voice timbre you want to generate' },
    styles: [
      { value: 'narrator', label: { zh: '温暖旁白', en: 'Narrator' } },
      { value: 'hero', label: { zh: '活力少年', en: 'Energetic Kid' } },
      { value: 'fairy', label: { zh: '灵动精灵', en: 'Fairy' } },
      { value: 'elder', label: { zh: '沉稳长老', en: 'Wise Elder' } },
      { value: 'robot', label: { zh: '机械伙伴', en: 'Robot' } }
    ]
  }
}

const SOUND_TYPE_OPTIONS: Array<SoundParamOption<SoundKind>> = [
  { value: 'music', label: SOUND_OPTIONS.music.label },
  { value: 'effect', label: SOUND_OPTIONS.effect.label },
  { value: 'speech', label: SOUND_OPTIONS.speech.label }
]

const CANDIDATE_COUNT = 4

function derivePromptBaseName(prompt: string, exampleText: string, defaultBaseName: string): string {
  const trimmed = prompt.trim()
  if (trimmed === '' || trimmed === exampleText) return defaultBaseName
  const firstClause = trimmed.split(/[，。！？,.!?\n]/)[0].trim()
  const sanitized = firstClause.replace(/[\\/:*?"<>|]/g, '').trim()
  if (sanitized === '') return defaultBaseName
  return sanitized.length > 18 ? sanitized.slice(0, 18).trim() : sanitized
}
</script>

<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { registerPlayer } from '@/utils/player-registry'
import { timeout } from '@/utils/utils'
import { fromBlob } from '@/models/common/file'
import { ensureValidSoundName } from '@/models/spx/common/asset-name'
import type { SpxProject } from '@/models/spx/project'
import { Sound } from '@/models/spx/sound'
import { UIButton, UIModal, UIModalClose, useConfirmDialog } from '@/components/ui'
import LayoutWithPreview from '../common/LayoutWithPreview.vue'
import SettingsInput from '../common/SettingsInput.vue'
import leftBottomBgUrl from '../common/phase-settings-left-bottom-bg.png'
import rightTopBgUrl from '../common/phase-settings-right-top-bg.png'
import SoundParamSelector from './SoundParamSelector.vue'
import SoundTakeCard from './SoundTakeCard.vue'
import { getStylePreview, loadSample, type Sample } from './samples'

const props = withDefaults(
  defineProps<{
    visible: boolean
    project?: SpxProject | null
  }>(),
  {
    project: null
  }
)

const emit = defineEmits<{
  resolved: [Sound]
  cancelled: []
}>()

const { t } = useI18n()
const confirm = useConfirmDialog()

type Draft = {
  prompt: string
  timingValue: number
  style: string | null
  results: Array<Sample | null>
  selected: number | null
  generating: boolean
}

function createDraft(kind: SoundKind): Draft {
  return {
    prompt: t(SOUND_OPTIONS[kind].example),
    timingValue: SOUND_OPTIONS[kind].defaultTiming,
    style: null,
    results: [],
    selected: null,
    generating: false
  }
}

const drafts = reactive<Record<SoundKind, Draft>>({
  music: createDraft('music'),
  effect: createDraft('effect'),
  speech: createDraft('speech')
})

const controllers: Record<SoundKind, AbortController | null> = {
  music: null,
  effect: null,
  speech: null
}

const kind = ref<SoundKind>('music')
const draft = computed(() => drafts[kind.value])
const selectedSample = computed(() =>
  draft.value.selected == null ? null : draft.value.results[draft.value.selected] ?? null
)

function takeName(targetKind: SoundKind, index: number) {
  const base = derivePromptBaseName(
    drafts[targetKind].prompt,
    t(SOUND_OPTIONS[targetKind].example),
    t(SOUND_OPTIONS[targetKind].name)
  )
  return `${base} ${index + 1}`
}

type PlayingState =
  | {
      source: 'take'
      kind: SoundKind
      index: number
    }
  | {
      source: 'style'
      kind: SoundKind
      style: string
    }

const playing = ref<PlayingState | null>(null)
const playingProgress = ref(0)

let playbackAudio: HTMLAudioElement | null = null
let playbackObjectUrl: string | null = null
let playbackRafId: number | null = null
const player = registerPlayer(stopPlayback)

function stopRaf() {
  if (playbackRafId != null) {
    cancelAnimationFrame(playbackRafId)
    playbackRafId = null
  }
}

function startRaf(audio: HTMLAudioElement, totalSeconds: number) {
  stopRaf()
  const tick = () => {
    if (playbackAudio !== audio || audio.paused || audio.ended) return
    const denominator = totalSeconds > 0 ? totalSeconds : audio.duration || 1
    playingProgress.value = Math.max(0, Math.min(1, audio.currentTime / denominator))
    playbackRafId = requestAnimationFrame(tick)
  }
  playbackRafId = requestAnimationFrame(tick)
}

function stopPlayback() {
  stopRaf()
  if (playbackAudio != null) {
    playbackAudio.pause()
    playbackAudio.ontimeupdate = null
    playbackAudio.onended = null
    playbackAudio = null
  }
  if (playbackObjectUrl != null) {
    URL.revokeObjectURL(playbackObjectUrl)
    playbackObjectUrl = null
  }
  playing.value = null
  playingProgress.value = 0
  player.onStopped()
}

async function startPlayback(blob: Blob, seconds: number, nextPlaying: PlayingState, startRatio = 0) {
  stopPlayback()
  player.onStart()

  const clampedRatio = Math.max(0, Math.min(1, startRatio))
  const objectUrl = URL.createObjectURL(blob)
  const audio = new Audio(objectUrl)
  playbackAudio = audio
  playbackObjectUrl = objectUrl
  playing.value = nextPlaying
  playingProgress.value = clampedRatio

  if (clampedRatio > 0 && seconds > 0) {
    audio.currentTime = clampedRatio * seconds
  }

  audio.onended = () => {
    if (playbackAudio === audio) stopPlayback()
  }

  try {
    await audio.play()
    if (playbackAudio !== audio) return
    startRaf(audio, seconds)
  } catch (error) {
    if (playbackAudio !== audio) return
    stopPlayback()
    throw error
  }
}

function isTakePlaying(index: number) {
  return playing.value?.source === 'take' && playing.value.kind === kind.value && playing.value.index === index
}

async function playTake(index: number) {
  const sample = draft.value.results[index]
  if (sample == null) return
  await startPlayback(sample.blob, sample.seconds, { source: 'take', kind: kind.value, index })
}

function seekTake(index: number, ratio: number) {
  const sample = draft.value.results[index]
  if (sample == null || adopting.value) return
  const clamped = Math.max(0, Math.min(1, ratio))
  if (isTakePlaying(index) && playbackAudio != null) {
    const duration = sample.seconds > 0 ? sample.seconds : playbackAudio.duration || 0
    if (duration > 0) {
      playbackAudio.currentTime = clamped * duration
    }
    playingProgress.value = clamped
    return
  }
  void startPlayback(sample.blob, sample.seconds, { source: 'take', kind: kind.value, index }, clamped).catch(() => {
    // Ignore interrupted playback promises when user scrubs rapidly across takes.
  })
}

function playStylePreview(style: string) {
  const preview = getStylePreview(style)
  return startPlayback(preview.blob, preview.seconds, { source: 'style', kind: kind.value, style })
}

function stopStylePreview() {
  if (playing.value?.source === 'style') {
    stopPlayback()
  }
}

function selectTake(index: number) {
  if (draft.value.results[index] == null || adopting.value) return
  draft.value.selected = index
}

function switchKind(nextKind: SoundKind) {
  if (nextKind === kind.value) return
  stopPlayback()
  kind.value = nextKind
}

function updateTimingValue(nextValue: number) {
  if (!Number.isFinite(nextValue) || nextValue <= 0) return
  draft.value.timingValue = nextValue
}

function abortAllDrafts() {
  for (const key of Object.keys(controllers) as SoundKind[]) {
    controllers[key]?.abort()
    controllers[key] = null
  }
}

const generate = useMessageHandle(
  async () => {
    const currentKind = kind.value
    const currentDraft = drafts[currentKind]
    if (currentDraft.prompt.trim() === '' || adopting.value) return

    if (playing.value?.kind === currentKind) {
      stopPlayback()
    }

    controllers[currentKind]?.abort()
    const runController = new AbortController()
    controllers[currentKind] = runController
    currentDraft.generating = true
    currentDraft.selected = null
    currentDraft.results = Array.from({ length: CANDIDATE_COUNT }, () => null)

    try {
      for (let i = 0; i < CANDIDATE_COUNT; i++) {
        const [sample] = await Promise.all([
          loadSample(currentKind, i + 1, currentDraft.timingValue, runController.signal, currentDraft.style),
          timeout(280, runController.signal)
        ])
        if (runController.signal.aborted) return
        currentDraft.results[i] = markRaw(sample)
      }
    } catch (error) {
      if (runController.signal.aborted) return
      currentDraft.results = []
      currentDraft.selected = null
      throw error
    } finally {
      if (controllers[currentKind] === runController) {
        controllers[currentKind] = null
        currentDraft.generating = false
      }
    }
  },
  { zh: '加载示例声音失败', en: 'Failed to load sample sounds' }
).fn

function handleInputKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    generate()
  }
}

const { fn: adopt, isLoading: adopting } = useMessageHandle(
  async () => {
    const sample = selectedSample.value
    const index = draft.value.selected
    if (sample == null || index == null) return

    stopPlayback()
    const name = ensureValidSoundName(takeName(kind.value, index), props.project)
    const file = fromBlob(`${name}.wav`, sample.blob)
    const sound = await Sound.create(name, file)

    abortAllDrafts()
    emit('resolved', sound)
  },
  { zh: '创建声音失败', en: 'Failed to create sound' }
)

const close = useMessageHandle(async () => {
  if (adopting.value) return
  stopPlayback()

  const hasUnsavedWork = (Object.keys(drafts) as SoundKind[]).some(
    (k) =>
      drafts[k].generating ||
      drafts[k].results.length > 0 ||
      drafts[k].style != null ||
      drafts[k].prompt !== t(SOUND_OPTIONS[k].example)
  )
  if (hasUnsavedWork) {
    await confirm({
      title: t({ zh: '退出声音生成？', en: 'Exit sound generation?' }),
      content: t({
        zh: '当前内容不会被保存，确定要退出吗？',
        en: 'Current progress will not be saved. Are you sure you want to exit?'
      }),
      confirmText: t({ zh: '退出', en: 'Exit' })
    })
  }

  abortAllDrafts()
  emit('cancelled')
}).fn

onBeforeUnmount(() => {
  abortAllDrafts()
  stopPlayback()
})

const bodyRef = ref<HTMLElement | null>(null)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    const textarea = bodyRef.value?.querySelector('textarea')
    if (textarea instanceof HTMLTextAreaElement) {
      textarea.focus({ preventScroll: true })
    }
  },
  { immediate: true, flush: 'post' }
)

const backdropStyle = {
  backgroundImage: `url(${leftBottomBgUrl}), url(${rightTopBgUrl})`
}
</script>

<template>
  <UIModal
    style="width: 1076px; height: min(800px, calc(100dvh - 32px))"
    :visible="visible"
    :radar="{ name: 'sound-generation-modal', desc: 'Modal for sound generation' }"
    aria-labelledby="sound-generation-title"
    mask-closable
    @update:visible="close"
  >
    <header class="flex-none h-14 flex items-center justify-between border-b border-grey-400 px-6">
      <h2 id="sound-generation-title" class="text-xl text-title">
        {{ $t({ zh: '生成声音', en: 'Sound Generator' }) }}
      </h2>
      <UIModalClose class="close" @click="close" />
    </header>

    <main
      ref="bodyRef"
      v-radar="{ name: 'sound-generation', desc: 'Interface for generating and selecting sounds' }"
      class="sound-gen-body flex-[1_1_0] min-h-0 flex flex-col items-stretch"
      :style="backdropStyle"
      @keydown="handleInputKeydown"
    >
      <LayoutWithPreview :has-preview="false">
        <SettingsInput v-model:description="draft.prompt" :enrichable="false" :disabled="draft.generating || adopting">
          <template #extra>
            <SoundParamSelector
              :name="{ zh: '声音类型', en: 'Sound type' }"
              :tips="{ zh: '请选择想要生成的声音类型', en: 'Please select the sound type you want to generate' }"
              :options="SOUND_TYPE_OPTIONS"
              :value="kind"
              :clearable="false"
              @update:value="(v) => v != null && switchKind(v)"
            >
              <template #icon>
                <svg
                  class="h-4.5 w-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M6 9.5V14.5M10 4.5V19.5M14 7.5V16.5M18 10V14"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
              </template>
            </SoundParamSelector>

            <SoundParamSelector
              :name="SOUND_OPTIONS[kind].styleName"
              :tips="SOUND_OPTIONS[kind].styleTips"
              :options="SOUND_OPTIONS[kind].styles"
              :placeholder-label="SOUND_OPTIONS[kind].styleName"
              :value="draft.style"
              clearable
              :playing-value="playing?.source === 'style' && playing.kind === kind ? playing.style : null"
              :playing-progress="playing?.source === 'style' && playing.kind === kind ? playingProgress : 0"
              :play-option="playStylePreview"
              @update:value="(v) => (draft.style = v)"
              @stop-preview="stopStylePreview"
              @popover-close="stopStylePreview"
            >
              <template #icon>
                <svg
                  v-if="kind === 'speech'"
                  class="h-4.5 w-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
                  <path d="M12 17.5V21" />
                </svg>
                <svg
                  v-else-if="kind === 'effect'"
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M11.999 5.25391C14.3815 5.25406 16.3135 7.18581 16.3135 9.56836C16.3135 9.88869 16.2772 10.2006 16.2109 10.501C16.9876 10.8524 17.6466 11.4282 18.0996 12.1592C18.642 13.0347 18.8534 14.076 18.6953 15.0938C18.5372 16.1114 18.0197 17.0392 17.2373 17.709C16.455 18.3785 15.4584 18.7468 14.4287 18.7461V18.7451C13.5584 18.7461 12.7123 18.4824 11.999 17.9951C11.8556 18.093 11.7058 18.1835 11.5508 18.2637C10.9379 18.5807 10.2574 18.7463 9.56738 18.7461C8.53878 18.7443 7.54323 18.375 6.7627 17.7051C5.98226 17.0352 5.46631 16.1082 5.30859 15.0918C5.15098 14.0754 5.36256 13.036 5.90332 12.1611C6.35511 11.4305 7.0129 10.8544 7.78809 10.502C7.7217 10.2012 7.68459 9.88902 7.68457 9.56836C7.68457 7.18594 9.61669 5.25427 11.999 5.25391ZM15.7227 11.7451C15.2733 12.5119 14.5949 13.1272 13.7803 13.4971C13.8912 13.9971 13.9125 14.5144 13.8418 15.0244C13.7469 15.7079 13.4893 16.3594 13.0908 16.9229C13.0611 16.9649 13.0282 17.005 12.9971 17.0459C13.433 17.2851 13.9254 17.4138 14.4287 17.4131L14.4297 17.4121C15.1411 17.4126 15.8296 17.1587 16.3701 16.6963C16.9105 16.2336 17.2686 15.5926 17.3779 14.8896C17.4871 14.1865 17.3405 13.4672 16.9658 12.8623C16.6649 12.3766 16.2326 11.9901 15.7227 11.7451ZM8.27539 11.7451C7.76764 11.9909 7.3368 12.3776 7.03711 12.8623C6.66353 13.4668 6.51707 14.1854 6.62598 14.8877C6.73502 15.5899 7.09165 16.2305 7.63086 16.6934C8.16993 17.1561 8.857 17.4106 9.56738 17.4121C10.0442 17.4122 10.515 17.2981 10.9385 17.0791C11.3618 16.8601 11.7266 16.5424 12.002 16.1533C12.2773 15.764 12.4549 15.3131 12.5205 14.8408C12.5662 14.5114 12.5553 14.1778 12.4912 13.8535C12.3299 13.8718 12.1653 13.8818 11.999 13.8818C10.4111 13.8816 9.02423 13.0229 8.27539 11.7451ZM11.999 6.58691C10.3531 6.58728 9.01855 7.92232 9.01855 9.56836C9.01871 11.2143 10.3532 12.5485 11.999 12.5488C13.6451 12.5487 14.9793 11.2144 14.9795 9.56836C14.9795 7.92219 13.6452 6.58707 11.999 6.58691Z"
                    fill="currentColor"
                  />
                </svg>
                <svg
                  v-else
                  class="h-4.5 w-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M9 17.5V6.2L19 4.2V15.5M9 9.2L19 7.2" />
                  <circle cx="6.5" cy="17.5" r="2.5" />
                  <circle cx="16.5" cy="15.5" r="2.5" />
                </svg>
              </template>
            </SoundParamSelector>

            <SoundParamSelector
              :name="SOUND_OPTIONS[kind].timingName"
              :tips="SOUND_OPTIONS[kind].timingTips"
              :options="SOUND_OPTIONS[kind].timingOptions"
              :value="draft.timingValue"
              :clearable="false"
              @update:value="(v) => v != null && updateTimingValue(v)"
            >
              <template #icon>
                <svg
                  v-if="kind === 'speech'"
                  class="h-4.5 w-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15.5 14" />
                </svg>
                <svg
                  v-else
                  class="h-4.5 w-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <line x1="10" x2="14" y1="2.5" y2="2.5" />
                  <line x1="12" x2="15" y1="13.5" y2="10.5" />
                  <circle cx="12" cy="13.5" r="7.5" />
                </svg>
              </template>
            </SoundParamSelector>
          </template>
          <template #submit>
            <UIButton
              v-radar="{ name: 'submit', desc: 'Click to generate sounds' }"
              type="primary"
              :loading="draft.generating"
              :disabled="adopting || draft.prompt.trim() === ''"
              @click="generate"
            >
              {{
                draft.results.length > 0 && !draft.generating
                  ? $t({ zh: '重新生成', en: 'Regenerate' })
                  : $t({ zh: '生成', en: 'Generate' })
              }}
            </UIButton>
          </template>
        </SettingsInput>

        <div class="min-h-48.5">
          <section
            v-if="draft.results.length > 0"
            v-radar="{ name: 'sound-selector', desc: 'Selector for choosing from generated sounds' }"
            class="flex flex-col items-center gap-3"
          >
            <ul class="m-0 grid w-full list-none grid-cols-2 gap-3 p-0">
              <li v-for="(sample, index) in draft.results" :key="`${kind}-${index}`" class="min-w-0">
                <SoundTakeCard
                  :name="takeName(kind, index)"
                  :sample="sample"
                  :active="draft.selected === index"
                  :playing="isTakePlaying(index)"
                  :progress="isTakePlaying(index) ? playingProgress : 0"
                  :disabled="adopting"
                  :play="() => playTake(index)"
                  @select="selectTake(index)"
                  @stop="stopPlayback"
                  @seek="(ratio) => seekTake(index, ratio)"
                />
              </li>
            </ul>

            <p class="text-center text-xs text-hint-2">
              <template v-if="draft.generating">
                <span role="status">{{ $t(SOUND_OPTIONS[kind].loadingTip) }}</span>
              </template>
              <template v-else>
                {{ $t(SOUND_OPTIONS[kind].selectionTip) }}
              </template>
            </p>
          </section>
        </div>
      </LayoutWithPreview>

      <footer class="w-full flex-none flex items-center justify-end gap-4 px-6 py-5">
        <UIButton
          v-radar="{ name: 'use', desc: 'Use the selected sound in the project' }"
          type="primary"
          size="large"
          :loading="adopting"
          :disabled="selectedSample == null"
          @click="adopt"
        >
          {{ $t({ zh: '采用', en: 'Use' }) }}
        </UIButton>
      </footer>
    </main>
  </UIModal>
</template>

<style scoped>
.sound-gen-body {
  background-position:
    left bottom,
    right -50px;
  background-repeat: no-repeat, no-repeat;
  background-size:
    520px auto,
    180px auto;
}
</style>
