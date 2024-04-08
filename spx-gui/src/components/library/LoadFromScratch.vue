<template>
  <div class="file-upload-container">
    <button type="button" class="custom-upload-btn" @click="triggerFileUpload">
      {{ $t('scratch.upload') }}
    </button>
    <input
      ref="fileUploadInput"
      type="file"
      accept=".sb3"
      style="display: none"
      @change="handleScratchFileUpload"
    />
  </div>
  <div class="asset-detail-info">
    <div>Sprites TODO: i18n / re-style / refactor as components</div>
    <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
      <n-grid-item v-for="asset in sprites" :key="asset.name" class="file-row">
        <div>{{ asset.name }}.{{ asset.extension }}</div>
        <n-image
          style="position: absolute; top: 30px; margin: auto; border-radius: 20px"
          preview-disabled
          width="80"
          height="80"
          :src="asset.src"
          :fallback-src="error"
        />
        <NButton @click="importAssetToProject(asset)">Import </NButton>
      </n-grid-item>
    </n-grid>
    <div>Sounds</div>
    <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
      <n-grid-item v-for="asset in sounds" :key="asset.name" class="file-row">
        <div>{{ asset.name }}.{{ asset.extension }}</div>
        <n-image
          preview-disabled
          style="position: absolute; top: 30px; margin: auto; border-radius: 20px"
          width="80"
          height="80"
          :src="soundsImportSvg"
          :fallback-src="error"
          @click="playAudio(asset)"
        />
        <NButton @click="importAssetToProject(asset)">Import </NButton>
      </n-grid-item>
    </n-grid>
    <div>Backdrops</div>
    <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
      <n-grid-item v-for="asset in backdrops" :key="asset.name" class="file-row">
        <div>{{ asset.name }}.{{ asset.extension }}</div>
        <n-image
          style="position: absolute; top: 30px; margin: auto; border-radius: 20px"
          preview-disabled
          width="80"
          height="80"
          :src="asset.src"
          :fallback-src="error"
        />
        <NButton @click="importAssetToProject(asset)">Import </NButton>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Sound } from '@/models/sound'
import { NButton, NGrid, NGridItem, NImage, useMessage } from 'naive-ui'
import { Sprite } from '@/models/sprite'
import error from '@/assets/error.svg'
import { parseScratchFileAssets, type ExportedScratchAsset } from '@/utils/scratch'
import soundsImportSvg from './images/sound-import.svg'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { fromBlob } from '@/models/common/file'
import { computed } from 'vue'
import { useEditorCtx } from '../editor/ProjectEditor.vue'

const editorCtx = useEditorCtx()

// Ref about asset infos.
const assetFileDetails = ref<ExportedScratchAsset[]>([])
const sprites = computed(() => assetFileDetails.value.filter((asset) => asset.type === 'sprite'))
const sounds = computed(() => assetFileDetails.value.filter((asset) => asset.type === 'sound'))
const backdrops = computed(() =>
  assetFileDetails.value.filter((asset) => asset.type === 'backdrop')
)
const fileUploadInput = ref<HTMLInputElement>()

const message = useMessage()

function triggerFileUpload() {
  if (fileUploadInput.value) {
    ;(fileUploadInput.value as HTMLInputElement).click()
  }
}

const handleScratchFileUpload = async (event: Event) => {
  let input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) {
    return
  }
  assetFileDetails.value = await parseScratchFileAssets(input.files[0])
}

const playAudio = async (asset: ExportedScratchAsset) => {
  let audio = new Audio(asset.src)
  audio.play()
}

async function importAssetToProject({ blob, name, extension, type }: ExportedScratchAsset) {
  const filename = `${name}.${extension}`
  switch (type) {
    case 'sprite': {
      const file = fromBlob(filename, blob)
      const costume = new Costume(name, file, {})
      const sprite = new Sprite(name, '', [costume], {})
      editorCtx.project.addSprite(sprite)
      break
    }
    case 'sound': {
      const sound = new Sound(name, fromBlob(filename, blob), {})
      editorCtx.project.addSound(sound)
      break
    }
    case 'backdrop': {
      const file = fromBlob(filename, blob)
      const backdrop = new Backdrop(name, file, {})
      editorCtx.project.stage.addBackdrop(backdrop) // TODO: replace instead of add backdrop
      break
    }
    default:
      message.error(`Unsupported asset type: ${type}`)
      throw new Error(`Unsupported asset type: ${type}`)
  }
  message.success(`Imported ${name}.${extension} TODO: use \`useMessageHandle\` for i18n`)
}
</script>

<style lang="scss" scoped>
@import '@/assets/theme.scss';

.download-infos {
  text-align: center;
}

.asset-detail-info {
  display: block;
  margin: 5px;
  min-height: 50vh;
  .selected-border {
    border: 3px solid $asset-library-card-title-1;
  }

  .selected-btn {
    background: #a6a6a680;
    color: white;
  }
  .file-row {
    margin: auto;
    margin-top: 10px;
    width: 80%;
    height: 150px;
    border-radius: 20px;
    // border: 3px solid $asset-library-card-title-1;
    border: 3px solid #eeeeee;
    box-shadow: 0 4px 4px 0 #00000026;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: visible;
    cursor: pointer;
    .video-play {
      position: absolute;
      top: 5px;
      right: 5px;
    }
    .file-btn {
      width: 100%;
      height: 100%;
      padding: 10px;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
    }
  }
}

.file-upload-container {
  text-align: center;
  padding: 4px;
  .custom-upload-btn,
  .custom-import-btn {
    font-size: 16px;
    color: rgb(0, 0, 0);
    border-radius: 20px;
    border: 2px solid rgb(0, 20, 41);
    box-shadow: rgb(0, 20, 41) -1px 2px;
    cursor: pointer;
    background-color: rgb(255, 248, 204);
    margin-left: 5px;
    font-family: ChauPhilomeneOne;
  }

  .custom-upload-btn:hover,
  .custom-import-btn:hover {
    background-color: rgb(255, 234, 204);
  }
}
</style>
