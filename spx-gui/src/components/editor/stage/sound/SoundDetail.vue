<template>
  <div class="flex w-full flex-col gap-large px-5 py-6">
    <div class="flex flex-col items-center">
      <div class="flex items-center gap-2 text-title">
        <AssetName>{{ sound.name }}</AssetName>
        <UIIcon
          v-radar="{ name: 'Rename sound', desc: 'Click to rename the sound' }"
          class="cursor-pointer text-grey-900 hover:text-grey-800 active:text-grey-1000"
          :title="$t({ en: 'Rename', zh: '重命名' })"
          type="edit"
          @click="handleNameEdit"
        />
      </div>
      <div class="text-grey-700 leading-4.5">
        {{ formattedTrimmedDuration || '&nbsp;' }}
      </div>
    </div>
    <WaveformPlayer
      ref="waveformPlayerRef"
      v-model:range="audioRange"
      style="height: 222px"
      :audio-src="audioUrl || undefined"
      :gain="gain"
      @progress="handleProgress"
      @stop="handleStop"
      @play="handlePlay"
    />
    <div class="flex">
      <PlayControl
        class="flex-[0_0_auto]"
        color="sound"
        :playing="playing != null"
        :progress="playing?.progress ?? 0"
        :play-handler="handlePlayClick"
        :loading="audioLoading"
        @stop="handleStopClick"
      />
      <VolumeSlider class="mx-6 flex-[0_1_438px]" :value="gain" @update:value="handleGainUpdate" />
      <div class="flex-[1_1_0]" />
      <div v-if="editing" class="flex flex-[0_0_auto] items-center gap-2">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel sound editing' }"
          color="boring"
          @click="handleResetEdit"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Save button', desc: 'Click to save sound edits' }"
          color="success"
          icon="check"
          :loading="handleSave.isLoading.value"
          @click="handleSave.fn"
        >
          {{ $t({ en: 'Save', zh: '保存' }) }}
        </UIButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFileUrl } from '@/utils/file'
import { stripExt } from '@/utils/path'
import { useMessageHandle } from '@/utils/exception'
import { formatDuration, useAudioDuration } from '@/utils/audio'
import { fromBlob } from '@/models/common/file'
import type { Sound } from '@/models/spx/sound'
import { UIIcon, UIButton } from '@/components/ui'
import { useRenameSound } from '@/components/asset'
import AssetName from '@/components/asset/AssetName.vue'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import PlayControl from '../../common/PlayControl.vue'
import VolumeSlider from './VolumeSlider.vue'
import { WaveformPlayer } from './waveform'

const props = defineProps<{
  sound: Sound
}>()

const editorCtx = useEditorCtx()
const renameSound = useRenameSound()

const handleNameEdit = useMessageHandle(() => renameSound(props.sound), {
  en: 'Failed to rename sound',
  zh: '重命名声音失败'
}).fn

const waveformPlayerRef = ref<InstanceType<typeof WaveformPlayer> | null>(null)
const gain = ref(1)
const audioRange = ref({ left: 0, right: 1 })

const editing = computed(() => audioRange.value.left !== 0 || audioRange.value.right !== 1 || gain.value !== 1)

type Playing = {
  /** Progress percentage, number in range `[0, 1]` */
  progress: number
}

const playing = ref<Playing | null>(null)
const [audioUrl, audioLoading] = useFileUrl(() => props.sound.file)

const handleResetEdit = () => {
  gain.value = 1
  audioRange.value = { left: 0, right: 1 }
}

watch(audioUrl, handleResetEdit)

const { duration } = useAudioDuration(() => audioUrl.value)
const formattedTrimmedDuration = computed(() => {
  if (duration.value === null) return ''
  const { left, right } = audioRange.value
  return formatDuration(duration.value * (right - left))
})

async function handlePlayClick() {
  if (waveformPlayerRef.value == null) return
  waveformPlayerRef.value.play()
}

function handlePlay() {
  playing.value = { progress: 0 }
}

function handleStopClick() {
  waveformPlayerRef.value?.stop()
  playing.value = null
}

function handleStop() {
  // delay to make the animation more natural
  setTimeout(() => {
    playing.value = null
  }, 400)
}

function handleProgress(value: number) {
  if (playing.value == null) return
  playing.value.progress = Math.max(playing.value.progress, value)
}

const handleGainUpdate = (v: number) => {
  gain.value = v
  waveformPlayerRef.value?.play()
}

const handleSave = useMessageHandle(
  async () => {
    if (waveformPlayerRef.value == null) return
    if (!editing.value) {
      return
    }

    const blob = await waveformPlayerRef.value.exportWav()
    const newFileName = stripExt(props.sound.file.name) + '.wav'
    const newFile = fromBlob(newFileName, blob)
    const sname = props.sound.name
    const action = { name: { en: `Update sound ${sname}`, zh: `修改声音 ${sname}` } }
    await editorCtx.state.history.doAction(action, () => props.sound.setFile(newFile))
  },
  {
    en: 'Failed to save sound',
    zh: '保存声音失败'
  }
)
</script>
