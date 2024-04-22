<template>
  <EditorHeader :color="uiVariables.color.sound.main">
    {{ sound.name }}
  </EditorHeader>
  <div class="main">
    <div class="name">
      {{ sound.name }}
      <UIIcon
        class="edit-icon"
        :title="$t({ en: 'Rename', zh: '重命名' })"
        type="edit"
        @click="handleNameEdit"
      />
    </div>
    <div class="content">
      <div ref="waveform" class="waveform"></div>
    </div>
    <div class="opeartions">
      <DumbSoundPlayer
        :color="uiVariables.color.sound"
        class="play-button"
        :playing="playing != null"
        :progress="playing?.progress ?? 0"
        @play="handlePlay"
        @stop="handleStop"
      />
    </div>
    <footer v-if="isLibraryEnabled()">
      <UIButton @click="addToLibrary(sound)">Add to asset library</UIButton>
    </footer>
  </div>
</template>

<script setup lang="ts">
import WaveSurfer from 'wavesurfer.js'
import { ref, watchEffect, onUnmounted } from 'vue'
import { useUIVariables, UIIcon, UIButton, useModal } from '@/components/ui'
import { isLibraryEnabled } from '@/utils/utils'
import type { Sound } from '@/models/sound'
import { useFileUrl } from '@/utils/file'
import { useAddAssetToLibrary } from '@/components/asset'
import { useEditorCtx } from '../EditorContextProvider.vue'
import EditorHeader from '../EditorHeader.vue'
import DumbSoundPlayer from './DumbSoundPlayer.vue'
import { useWavesurfer } from './wavesurfer'
import SoundRenameModal from './SoundRenameModal.vue'

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

const uiVariables = useUIVariables()
const waveform = ref<HTMLDivElement>()
const createWavesurfer = useWavesurfer(waveform)

type Playing = {
  progress: number // percent
}

const playing = ref<Playing | null>(null)
const audioUrl = useFileUrl(() => props.sound.file)
let wavesurfer: WaveSurfer | null = null

watchEffect(
  async () => {
    wavesurfer?.destroy()
    if (audioUrl.value == null) return

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
  await wavesurfer.play()
}

function handleStop() {
  wavesurfer?.stop()
  playing.value = null
}

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
}

.waveform {
  width: 100%;
  height: 222px; /** TODO: scale with width? */
}

.opeartions {
  .play-button {
    width: 42px;
    height: 42px;
  }
}
</style>
