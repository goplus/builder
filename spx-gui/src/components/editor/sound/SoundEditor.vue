<template>
  <EditorHeader color="sound">
    <AssetName>{{ sound.name }}</AssetName>
  </EditorHeader>
  <div class="main">
    <div class="name">
      <AssetName>{{ sound.name }}</AssetName>
      <UIIcon
        class="edit-icon"
        :title="$t({ en: 'Rename', zh: '重命名' })"
        type="edit"
        @click="handleNameEdit"
      />
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
        <UIButton type="boring" @click="handleResetEdit">Cancel</UIButton>
        <UIButton
          type="success"
          icon="check"
          :loading="handleSave.isLoading.value"
          @click="handleSave.fn"
          >Save</UIButton
        >
      </div>
    </div>
    <footer v-if="isLibraryEnabled()">
      <UIButton @click="addToLibrary(sound)">Add to asset library</UIButton>
    </footer>
  </div>
</template>

<script setup lang="ts">
import WaveSurfer from 'wavesurfer.js'
import { ref, watchEffect, onUnmounted, watch } from 'vue'
import { UIIcon, UIButton, useModal } from '@/components/ui'
import { isLibraryEnabled } from '@/utils/utils'
import { Sound } from '@/models/sound'
import { useFileUrl } from '@/utils/file'
import { useAddAssetToLibrary } from '@/components/asset'
import AssetName from '@/components/asset/AssetName.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import EditorHeader from '../EditorHeader.vue'
import DumbSoundPlayer from './DumbSoundPlayer.vue'
import { useWavesurfer } from './wavesurfer'
import SoundRenameModal from './SoundRenameModal.vue'
import SoundEditorControl from './SoundEditorControl.vue'
import VolumeSlider from './VolumeSlider.vue'
import { trimAndApplyGain } from '@/utils/audio'
import { fromBlob } from '@/models/common/file'
import { useMessageHandle } from '@/utils/exception'

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

const editing = ref(false)

const waveform = ref<HTMLDivElement>()
const gain = ref(1)
const audioRange = ref<{ left: number; right: number }>({ left: 0, right: 1 })
const { createWavesurfer } = useWavesurfer(waveform, gain)

type Playing = {
  progress: number // percent
}

const playing = ref<Playing | null>(null)
const [audioUrl, audioLoading] = useFileUrl(() => props.sound.file)
let wavesurfer: WaveSurfer | null = null

watchEffect(async () => {
  wavesurfer?.destroy()
  if (audioUrl.value == null) return

  handleResetEdit()

  wavesurfer = createWavesurfer()
  wavesurfer.load(audioUrl.value)

  wavesurfer.on('timeupdate', () => {
    if (playing.value == null || wavesurfer == null) return
    playing.value.progress = Math.round(
      (wavesurfer.getCurrentTime() / wavesurfer.getDuration()) * 100
    )
  })
  wavesurfer.on('error', (e) => {
    console.warn('wavesurfer error:', e)
    handleStop()
  })
  wavesurfer.on('finish', () => {
    // delay to make the animation more natural
    setTimeout(handleStop, 400)
  })
})

watch(gain, () => {
  wavesurfer?.zoom(1)
})

onUnmounted(() => {
  wavesurfer?.destroy()
})

async function handlePlay() {
  if (wavesurfer == null) return
  playing.value = { progress: 0 }
  await wavesurfer.play()
}

function handleStop() {
  wavesurfer?.stop()
  playing.value = null
}

const handleAudioRangeUpdate = (v: { left: number; right: number }) => {
  audioRange.value = v
  editing.value = true
}

const handleGainUpdate = (v: number) => {
  gain.value = v
  editing.value = true
}

const handleResetEdit = () => {
  gain.value = 1
  audioRange.value = { left: 0, right: 1 }
  editing.value = false
}

const handleSave = useMessageHandle(
  async () => {
    if (wavesurfer == null) return
    if (audioRange.value.left === 0 && audioRange.value.right === 1 && gain.value === 1) {
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
    props.sound.file = newFile
  },
  {
    en: 'Failed to save sound',
    zh: '保存音频失败'
  }
)

const addToLibrary = useAddAssetToLibrary()
</script>

<style scoped lang="scss">
.main {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
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
  flex: 1;
}

.opeartions {
  .play-button {
    width: 42px;
    height: 42px;
  }

  display: flex;
  gap: 48px;

  .volume-slider {
    width: 400px;
  }

  .editing-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}
</style>
