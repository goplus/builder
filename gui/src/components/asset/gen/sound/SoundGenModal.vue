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

function derivePromptBaseName(prompt: string, kind: SoundKind, exampleText: string, defaultBaseName: string): string {
  const trimmed = prompt.trim()
  if (trimmed === '' || trimmed === exampleText) return defaultBaseName
  // Take the first short clause and strip characters that are awkward in filenames.
  const firstClause = trimmed.split(/[，。！？,.!?\n]/)[0].trim()
  const sanitized = firstClause.replace(/[\\/:*?"<>|]/g, '').trim()
  if (sanitized === '') return defaultBaseName
  return sanitized.length > 18 ? sanitized.slice(0, 18).trim() : sanitized
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { timeout } from '@/utils/utils'
import { registerPlayer } from '@/utils/player-registry'
import { fromBlob } from '@/models/common/file'
import { Sound } from '@/models/spx/sound'
import { UIButton, UIIcon, UIModal, UIModalClose, useConfirmDialog } from '@/components/ui'
import SettingsInput from '../common/SettingsInput.vue'
import leftBottomBgUrl from '../common/phase-settings-left-bottom-bg.png'
import rightTopBgUrl from '../common/phase-settings-right-top-bg.png'
import SoundParamSelector from './SoundParamSelector.vue'
import SoundTakeCard from './SoundTakeCard.vue'
import { getStylePreview, loadSample, type Sample } from './samples'

const props = defineProps<{
  visible: boolean
}>()

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
  controller: AbortController | null
}

function createDraft(kind: SoundKind): Draft {
  return {
    prompt: t(SOUND_OPTIONS[kind].example),
    timingValue: SOUND_OPTIONS[kind].defaultTiming,
    style: null,
    results: [],
    selected: null,
    generating: false,
    controller: null
  }
}

const drafts = reactive<Record<SoundKind, Draft>>({
  music: createDraft('music'),
  effect: createDraft('effect'),
  speech: createDraft('speech')
})

const kind = ref<SoundKind>('music')
const draft = computed(() => drafts[kind.value])
const selectedSample = computed(() =>
  draft.value.selected == null ? null : draft.value.results[draft.value.selected] ?? null
)
const completedCount = computed(() => draft.value.results.filter((sample) => sample != null).length)

function takeName(targetKind: SoundKind, index: number) {
  const base = derivePromptBaseName(
    drafts[targetKind].prompt,
    targetKind,
    t(SOUND_OPTIONS[targetKind].example),
    t(SOUND_OPTIONS[targetKind].name)
  )
  return `${base} ${index + 1}`
}

// 60fps audio playback & direct waveform scrubbing engine
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
const progress = ref(0)
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
    progress.value = Math.max(0, Math.min(1, audio.currentTime / denominator))
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
  progress.value = 0
  player.onStopped()
}

async function startAudioPlayback(blob: Blob, seconds: number, nextPlaying: PlayingState, startRatio = 0) {
  stopPlayback()
  player.onStart()

  const objectUrl = URL.createObjectURL(blob)
  const audio = new Audio(objectUrl)
  playbackAudio = audio
  playbackObjectUrl = objectUrl
  playing.value = nextPlaying

  const clampedRatio = Math.max(0, Math.min(0.995, startRatio))
  progress.value = clampedRatio

  audio.onended = () => {
    if (playbackAudio === audio) stopPlayback()
  }

  try {
    await audio.play()
    if (playbackAudio !== audio) return
    if (clampedRatio > 0) {
      audio.currentTime = clampedRatio * seconds
    }
    startRaf(audio, seconds)
  } catch (error) {
    if (playbackAudio !== audio) return
    stopPlayback()
    throw error
  }
}

async function startPlayback(targetKind: SoundKind, index: number, startRatio = 0) {
  const sample = drafts[targetKind].results[index]
  if (sample == null) return
  await startAudioPlayback(sample.blob, sample.seconds, { source: 'take', kind: targetKind, index }, startRatio)
}

function playTake(index: number) {
  return startPlayback(kind.value, index, 0)
}

function playStylePreview(style: string) {
  const preview = getStylePreview(style)
  return startAudioPlayback(preview.blob, preview.seconds, { source: 'style', kind: kind.value, style }, 0)
}

function stopStylePreview() {
  if (playing.value?.source === 'style') {
    stopPlayback()
  }
}

const seekTake = useMessageHandle(
  async (index: number, ratio: number) => {
    const currentKind = kind.value
    const sample = drafts[currentKind].results[index]
    if (sample == null) return

    const clamped = Math.max(0, Math.min(0.995, ratio))
    if (
      playing.value?.source === 'take' &&
      playing.value.kind === currentKind &&
      playing.value.index === index &&
      playbackAudio != null
    ) {
      playbackAudio.currentTime = clamped * sample.seconds
      progress.value = clamped
      return
    }
    await startPlayback(currentKind, index, clamped)
  },
  { zh: '播放失败', en: 'Failed to play' }
).fn

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
  for (const key of Object.keys(drafts) as SoundKind[]) {
    drafts[key].controller?.abort()
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

    currentDraft.controller?.abort()
    const runController = new AbortController()
    currentDraft.controller = runController
    currentDraft.generating = true
    currentDraft.selected = null
    currentDraft.results = [null, null, null, null]

    try {
      for (let i = 0; i < 4; i++) {
        const [sample] = await Promise.all([
          loadSample(currentKind, i + 1, currentDraft.timingValue, runController.signal, currentDraft.style),
          timeout(280, runController.signal)
        ])
        if (runController.signal.aborted) return
        currentDraft.results[i] = sample
      }
    } catch (error) {
      if (runController.signal.aborted) return
      currentDraft.results = []
      currentDraft.selected = null
      throw error
    } finally {
      if (currentDraft.controller === runController) {
        currentDraft.controller = null
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
    const name = takeName(kind.value, index)
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
    :radar="{ name: 'Sound generator', desc: 'Generate music and sound effects' }"
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
      v-radar="{ name: 'Sound generation', desc: 'Interface for generating and selecting sounds' }"
      class="sound-gen-body flex-[1_1_0] min-h-0 flex flex-col items-stretch"
      :style="backdropStyle"
    >
      <div class="sound-gen-scroll flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div class="w-full max-w-[660px] mx-auto my-auto px-6 py-7 flex flex-col gap-6" @keydown="handleInputKeydown">
          <SettingsInput
            v-model:description="draft.prompt"
            :enrichable="false"
            :disabled="draft.generating || adopting"
          >
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
                  <UIIcon type="sound" />
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
                :playing-progress="playing?.source === 'style' && playing.kind === kind ? progress : 0"
                :play-option="playStylePreview"
                @update:value="(v) => (draft.style = v)"
                @stop-preview="stopStylePreview"
                @popover-close="stopStylePreview"
              >
                <template #icon>
                  <UIIcon v-if="kind === 'speech'" type="microphone" />
                  <svg
                    v-else
                    class="size-4"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M6.25 11.75V4.25L12.75 3V10.5M6.25 6.25L12.75 5"
                      stroke="currentColor"
                      stroke-width="1.35"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <circle cx="4.5" cy="11.75" r="1.75" stroke="currentColor" stroke-width="1.35" />
                    <circle cx="11" cy="10.5" r="1.75" stroke="currentColor" stroke-width="1.35" />
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
                  <UIIcon :type="kind === 'speech' ? 'clock' : 'timer'" />
                </template>
              </SoundParamSelector>
            </template>
            <template #submit>
              <UIButton
                v-radar="{ name: 'Submit', desc: 'Click to generate sounds' }"
                type="primary"
                :loading="draft.generating"
                :disabled="adopting || !draft.prompt.trim()"
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

          <!-- Reserved results stage keeps the prompt input anchored without layout jumps. -->
          <div class="min-h-[216px]">
            <Transition name="results-reveal">
              <section
                v-if="draft.results.length > 0"
                :aria-label="$t({ zh: '生成结果', en: 'Generated sounds' })"
                class="flex flex-col gap-3"
              >
                <ul class="m-0 list-none grid grid-cols-1 min-[560px]:grid-cols-2 gap-3 p-0">
                  <li
                    v-for="(sample, index) in draft.results"
                    :key="`${kind}-${index}`"
                    class="take-grid-item"
                    :style="{ '--stagger-index': index }"
                  >
                    <SoundTakeCard
                      :index="index"
                      :name="takeName(kind, index)"
                      :sample="sample"
                      :active="draft.selected === index"
                      :playing="playing?.source === 'take' && playing.kind === kind && playing.index === index"
                      :progress="
                        playing?.source === 'take' && playing.kind === kind && playing.index === index ? progress : 0
                      "
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
                    <span role="status">
                      {{ $t(SOUND_OPTIONS[kind].loadingTip) }}
                      <span class="tabular-nums">{{ completedCount }} / 4</span>
                    </span>
                  </template>
                  <template v-else>
                    {{ $t(SOUND_OPTIONS[kind].selectionTip) }}
                  </template>
                </p>
              </section>
            </Transition>
          </div>
        </div>
      </div>

      <footer class="w-full flex-none flex items-center justify-end gap-4 px-6 py-5">
        <UIButton
          v-radar="{ name: 'Use', desc: 'Use the selected sound in the project' }"
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

.results-reveal-enter-active {
  transition: opacity 220ms cubic-bezier(0.2, 0, 0, 1);
}

.results-reveal-leave-active {
  transition: opacity 150ms ease-out;
}

.results-reveal-enter-from,
.results-reveal-leave-to {
  opacity: 0;
}

.results-reveal-enter-active .take-grid-item {
  animation: sound-card-enter 260ms cubic-bezier(0.2, 0, 0, 1) backwards;
  animation-delay: calc(var(--stagger-index, 0) * 40ms);
}

@keyframes sound-card-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 767px) {
  .sound-gen-body {
    background-size:
      220px auto,
      110px auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .results-reveal-enter-active .take-grid-item {
    animation: none;
  }
}
</style>
