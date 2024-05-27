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
        <UIIcon
          class="edit-icon"
          :title="$t({ en: 'Rename', zh: '重命名' })"
          type="edit"
          @click="handleNameEdit"
        />
      </div>
      <div class="duration">
        {{ formattedDuration || '&nbsp;' }}
      </div>
    </div>
    <div class="content">
      <SoundEditorControl :value="audioRange" @update:value="handleAudioRangeUpdate" />
      <div ref="waveform" class="waveform"></div>
    </div>
    <div class="opeartions">
      <DumbSoundPlayer
        color="sound"
        class="play-button"
        :playing="playing != null"
        :progress="playing?.progress ?? 0"
        :play-handler="handlePlay"
        :loading="audioLoading"
        @stop="handleStop"
      />
      <VolumeSlider class="volume-slider" :value="gain" @update:value="handleGainUpdate" />
      <div class="spacer" />
      <div v-if="editing" class="editing-buttons">
        <UIButton type="boring" @click="handleResetEdit(true)">{{
          $t({ en: 'Cancel', zh: '取消' })
        }}</UIButton>
        <UIButton
          type="success"
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
import WaveSurfer from 'wavesurfer.js'
import { ref, watchEffect, onUnmounted, computed } from 'vue'
import { UIIcon, UITab, UITabs, useModal } from '@/components/ui'
import type { Sound } from '@/models/sound'
import { useFileUrl } from '@/utils/file'
import AssetName from '@/components/asset/AssetName.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import EditorHeader from '../common/EditorHeader.vue'
import DumbSoundPlayer from './DumbSoundPlayer.vue'
import { useWavesurfer } from './wavesurfer'
import SoundRenameModal from './SoundRenameModal.vue'
import SoundEditorControl from './SoundEditorControl.vue'
import VolumeSlider from './VolumeSlider.vue'
import { trimAndApplyGain } from '@/utils/audio'
import { fromBlob } from '@/models/common/file'
import { useMessageHandle } from '@/utils/exception'
import { UIButton } from '@/components/ui'
import { useAudioDuration } from '@/utils/audio'

const props = defineProps<{
  sound: Sound
}>()

const editorCtx = useEditorCtx()
const renameSound = useModal(SoundRenameModal)

function handleNameEdit() {
  renameSound({
    sound: props.sound,
    project: editorCtx.project
  })
}

const waveform = ref<HTMLDivElement>()
const gain = ref(1)
const audioRange = ref<{ left: number; right: number }>({ left: 0, right: 1 })
const createWavesurfer = useWavesurfer(waveform, gain)

const editing = computed(
  () => audioRange.value.left !== 0 || audioRange.value.right !== 1 || gain.value !== 1
)

type Playing = {
  progress: number // percent
}

const playing = ref<Playing | null>(null)
const [audioUrl, audioLoading] = useFileUrl(() => props.sound.file)
let wavesurfer: WaveSurfer | null = null

const { formattedDuration } = useAudioDuration(() => audioUrl.value)

watchEffect(
  async () => {
    wavesurfer?.destroy()
    if (audioUrl.value == null) return

    handleResetEdit()

    wavesurfer = createWavesurfer().wavesurfer
    wavesurfer.load(audioUrl.value)

    wavesurfer.on('timeupdate', () => {
      if (playing.value == null || wavesurfer == null) return
      const ratio = wavesurfer.getCurrentTime() / wavesurfer.getDuration()

      // For a smoother progress animation we make sure
      // the progress is always increasing
      playing.value.progress = Math.max(
        playing.value.progress,
        Math.round(
          ((ratio - audioRange.value.left) / (audioRange.value.right - audioRange.value.left)) * 100
        )
      )
      if (ratio >= audioRange.value.right) {
        handleStop()
      }
    })
    wavesurfer.on('error', (e) => {
      console.warn('wavesurfer error:', e)
      handleStop()
    })
  },
  {
    flush: 'post'
  }
)

onUnmounted(() => {
  wavesurfer?.destroy()
})

async function handlePlay() {
  if (wavesurfer == null) return
  playing.value = { progress: 0 }
  wavesurfer.seekTo(audioRange.value.left)
  await wavesurfer.play()
}

function handleStop() {
  wavesurfer?.stop()
  setTimeout(() => {
    playing.value = null
  }, 400)
}

const handleAudioRangeUpdate = (v: { left: number; right: number }) => {
  audioRange.value = v
}

const handleGainUpdate = (v: number) => {
  gain.value = v
  wavesurfer?.zoom(1)
}

const handleResetEdit = (redraw?: boolean) => {
  gain.value = 1
  audioRange.value = { left: 0, right: 1 }
  if (redraw) {
    wavesurfer?.zoom(1)
  }
}

const handleSave = useMessageHandle(
  async () => {
    if (wavesurfer == null) return
    if (!editing.value) {
      return
    }

    const ab = await props.sound.file.arrayBuffer()
    const srcBlob = new Blob([ab], {
      type: props.sound.file.type
    })

    const blob = await trimAndApplyGain(
      srcBlob,
      audioRange.value.left,
      audioRange.value.right,
      gain.value
    )

    const newFile = fromBlob(props.sound.file.name, blob)
    props.sound.setFile(newFile)
  },
  {
    en: 'Failed to save sound',
    zh: '保存音频失败'
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

.content {
  width: 100%;
  position: relative;
  border: 1px solid var(--ui-color-grey-500);
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;
}

.waveform {
  width: 100%;
  height: 222px; /** TODO: scale with width? */
  padding: 0 16px;
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
</style>
