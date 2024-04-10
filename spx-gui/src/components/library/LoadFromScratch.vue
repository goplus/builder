<template>
  <div class="asset-detail-info">
    <div>Sprites TODO: i18n / re-style / refactor as components / include SVG?</div>
    <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
      <n-grid-item v-for="asset in scratchAssets?.sprites" :key="asset.name" class="file-row">
        <div>{{ asset.name }}</div>
        <ArrayBufferImage
          style="position: absolute; top: 30px; margin: auto; border-radius: 20px"
          preview-disabled
          width="80"
          height="80"
          :fallback-src="error"
          :array-buffer="asset.costumes[0].arrayBuffer"
        />
        <NButton @click="importSprite(asset)">Import</NButton>
      </n-grid-item>
    </n-grid>
    <div>Sounds</div>
    <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
      <n-grid-item v-for="asset in scratchAssets?.sounds" :key="asset.name" class="file-row">
        <div>{{ asset.filename }}</div>
        <n-image
          preview-disabled
          style="position: absolute; top: 30px; margin: auto; border-radius: 20px"
          width="80"
          height="80"
          :src="soundsImportSvg"
          @click="playAudio(asset)"
        />
        <NButton @click="importSound(asset)">Import</NButton>
      </n-grid-item>
    </n-grid>
    <div>Backdrops</div>
    <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
      <n-grid-item v-for="asset in scratchAssets?.backdrops" :key="asset.name" class="file-row">
        <div>{{ asset.filename }}</div>
        <ArrayBufferImage
          :array-buffer="asset.arrayBuffer"
          style="position: absolute; top: 30px; margin: auto; border-radius: 20px"
          preview-disabled
          width="80"
          height="80"
          :fallback-src="error"
        />
        <NButton @click="importBackdrop(asset)">Import</NButton>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { Sound } from '@/models/sound'
import { NButton, NGrid, NGridItem, NImage, useMessage } from 'naive-ui'
import { Sprite } from '@/models/sprite'
import error from '@/assets/error.svg'
import { type ExportedScratchAssets, type ExportedScratchFile } from '@/utils/scratch'
import soundsImportSvg from './images/sound-import.svg'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { File as LazyFile } from '@/models/common/file'
import { getMimeFromExt } from '@/utils/file'
import ArrayBufferImage from './ArrayBufferImage.vue'
import type { ExportedScratchSprite } from '@/utils/scratch'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'

defineProps<{
  scratchAssets: ExportedScratchAssets
}>()

const editorCtx = useEditorCtx()

const message = useMessage()

const playAudio = (asset: ExportedScratchFile) => {
  const blob = new Blob([asset.arrayBuffer], { type: getMimeFromExt(asset.extension) })
  const url = URL.createObjectURL(blob)
  let audio = new Audio(url)
  audio.play()
  audio.onended = () => {
    URL.revokeObjectURL(url)
  }
}

const scratchToSpxFile = (scratchFile: ExportedScratchFile) => {
  return new LazyFile(
    `${scratchFile.name}.${scratchFile.extension}`,
    async () => scratchFile.arrayBuffer,
    {}
  )
}

const importSprite = async (asset: ExportedScratchSprite) => {
  const costumes = asset.costumes.map(
    (costume) =>
      new Costume(costume.name, new LazyFile(costume.name, async () => costume.arrayBuffer))
  )
  const sprite = new Sprite(asset.name, '')
  for (const costume of costumes) {
    sprite.addCostume(costume)
  }
  editorCtx.project.addSprite(sprite)
  message.success(`Imported sprite ${asset.name}`)
}

const importSound = async (asset: ExportedScratchFile) => {
  const file = scratchToSpxFile(asset)
  const sound = new Sound(asset.name, file)
  editorCtx.project.addSound(sound)
  message.success(`Imported sound ${file.name}`)
}

const importBackdrop = async (asset: ExportedScratchFile) => {
  const file = scratchToSpxFile(asset)
  const backdrop = new Backdrop(asset.name, file)
  editorCtx.project.stage.addBackdrop(backdrop) // FIXME: Replace instead of add
  message.success(`Imported backdrop ${file.name}`)
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
</style>
