<template>
  <EditorHeader>
    <UITabs value="sound" color="sound">
      <UITab value="sound">{{ $t({ en: 'Sound', zh: '声音' }) }}</UITab>
    </UITabs>
  </EditorHeader>
  <div class="main">
    <div class="header">
      <div class="name">
        <AssetName>{{ sound.name }}</AssetName>
        <UIIcon class="edit-icon" :title="$t({ en: 'Rename', zh: '重命名' })" type="edit" @click="handleNameEdit" />
      </div>
      <div class="duration">
        {{ formattedTrimmedDuration || '&nbsp;' }}
      </div>
    </div>
    <WaveformPlayer
      ref="waveformPlayerRef"
      v-model:range="audioRange"
      class="waveform-player"
      :audio-src="audioUrl || undefined"
      :gain="gain"
      @progress="handleProgress"
      @stop="handleStop"
      @play="handlePlay"
    />
    <div class="opeartions">
      <DumbSoundPlayer
        color="sound"
        class="play-button"
        :playing="playing != null"
        :progress="playing?.progress ?? 0"
        :play-handler="handlePlayClick"
        :loading="audioLoading"
        @stop="handleStopClick"
      />
      <VolumeSlider class="volume-slider" :value="gain" @update:value="handleGainUpdate" />
      <div class="spacer" />
      <div v-if="editing" class="editing-buttons">
        <UIButton type="boring" @click="handleResetEdit">{{ $t({ en: 'Cancel', zh: '取消' }) }}</UIButton>
        <UIButton type="success" icon="check" :loading="handleSave.isLoading.value" @click="handleSave.fn">
          {{ $t({ en: 'Save', zh: '保存' }) }}
        </UIButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UIIcon, UITab, UITabs } from '@/components/ui'
import type { Sound } from '@/models/sound'
import { useFileUrl } from '@/utils/file'
import AssetName from '@/components/asset/AssetName.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import EditorHeader from '../common/EditorHeader.vue'
import DumbSoundPlayer from './DumbSoundPlayer.vue'
import VolumeSlider from './VolumeSlider.vue'
import { fromBlob } from '@/models/common/file'
import { useMessageHandle } from '@/utils/exception'
import { UIButton } from '@/components/ui'
import { useRenameSound } from '@/components/asset'
import { formatDuration, useAudioDuration } from '@/utils/audio'
import { WaveformPlayer } from './waveform'

const props = defineProps<{
  sound: Sound
}>()

const editorCtx = useEditorCtx()
const renameSound = useRenameSound()

const handleNameEdit = useMessageHandle(
  () =>
    renameSound({
      sound: props.sound,
      project: editorCtx.project
    }),
  { en: 'Failed to rename sound', zh: '重命名声音失败' }
).fn

const waveformPlayerRef = ref<InstanceType<typeof WaveformPlayer> | null>(null)
const gain = ref(1)
const audioRange = ref({ left: 0, right: 1 })

const editing = computed(() => audioRange.value.left !== 0 || audioRange.value.right !== 1 || gain.value !== 1)

type Playing = {
  progress: number // percent
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
  playing.value.progress = Math.max(playing.value.progress, value * 100)
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
    const newFile = fromBlob(props.sound.file.name, blob)
    const sname = props.sound.name
    const action = { name: { en: `Update sound ${sname}`, zh: `修改声音 ${sname}` } }
    await editorCtx.project.history.doAction(action, () => props.sound.setFile(newFile))
  },
  {
    en: 'Failed to save sound',
    zh: '保存声音失败'
  }
)
</script>

<style scoped lang="scss">
.main {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.duration {
  color: var(--ui-color-grey-700);
  line-height: 18px;
}

.name {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-color-title);

  .edit-icon {
    cursor: pointer;
    color: var(--ui-color-grey-900);
    &:hover {
      color: var(--ui-color-grey-800);
    }
    &:active {
      color: var(--ui-color-grey-1000);
    }
  }
}

.spacer {
  flex: 1 1 0;
}

.opeartions {
  .play-button {
    width: 42px;
    height: 42px;
    min-width: 42px;
    min-height: 42px;
  }

  display: flex;

  .volume-slider {
    width: 400px;
    margin: 0 48px;
  }

  .editing-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.waveform-player {
  height: 222px;
}
</style>
