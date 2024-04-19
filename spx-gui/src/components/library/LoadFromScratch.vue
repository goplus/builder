<template>
  <div>
    <template v-if="scratchAssets.sprites.length">
      <div>Sprites</div>
      <NGrid cols="6">
        <NGridItem v-for="asset in scratchAssets.sprites" :key="asset.name" class="file-row">
          <div>{{ asset.name }}</div>
          <BlobImage
            preview-disabled
            width="80"
            height="80"
            :fallback-src="error"
            :blob="asset.costumes[0].blob"
          />
          <NButton @click="importSprite(asset)">Import</NButton>
        </NGridItem>
      </NGrid>
    </template>
    <div>Sounds</div>
    <NGrid cols="6">
      <NGridItem v-for="asset in scratchAssets.sounds" :key="asset.name" class="file-row">
        <div>{{ asset.filename }}</div>
        <div class="sound-container">
          <BlobSoundPlayer :blob="asset.blob" />
        </div>
      </NGridItem>
    </NGrid>
    <div>Backdrops</div>
    <NGrid cols="6">
      <NGridItem v-for="asset in scratchAssets.backdrops" :key="asset.name" class="file-row">
        <div>{{ asset.filename }}</div>
        <BlobImage
          :blob="asset.blob"
          preview-disabled
          width="80"
          height="80"
          :fallback-src="error"
        />
        <NButton @click="importBackdrop(asset)">Import</NButton>
      </NGridItem>
    </NGrid>
  </div>
</template>

<script setup lang="ts">
import { Sound } from '@/models/sound'
import { NButton, NGrid, NGridItem, useMessage } from 'naive-ui'
import { Sprite } from '@/models/sprite'
import error from '@/assets/error.svg'
import { type ExportedScratchAssets, type ExportedScratchFile } from '@/utils/scratch'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { File as LazyFile } from '@/models/common/file'
import BlobImage from './BlobImage.vue'
import type { ExportedScratchSprite } from '@/utils/scratch'
import type { Project } from '@/models/project'
import BlobSoundPlayer from './BlobSoundPlayer.vue'

const props = defineProps<{
  scratchAssets: ExportedScratchAssets
  project: Project
}>()

const message = useMessage()

const scratchToSpxFile = (scratchFile: ExportedScratchFile) => {
  return new LazyFile(
    `${scratchFile.name}.${scratchFile.extension}`,
    () => scratchFile.blob.arrayBuffer(),
    {}
  )
}

const importSprite = async (asset: ExportedScratchSprite) => {
  const costumes = asset.costumes.map((costume) =>
    Costume.create(costume.name, new LazyFile(costume.name, () => costume.blob.arrayBuffer()))
  )
  const sprite = Sprite.create(asset.name, '')
  for (const costume of costumes) {
    sprite.addCostume(costume)
  }
  props.project.addSprite(sprite)
  message.success(`Imported sprite ${asset.name}`)
}

const importSound = async (asset: ExportedScratchFile) => {
  const file = scratchToSpxFile(asset)
  const sound = Sound.create(asset.name, file)
  props.project.addSound(sound)
  message.success(`Imported sound ${file.name}`)
}

const importBackdrop = async (asset: ExportedScratchFile) => {
  const file = scratchToSpxFile(asset)
  const backdrop = Backdrop.create(asset.name, file)
  props.project.stage.setBackdrop(backdrop)
  message.success(`Imported backdrop ${file.name}`)
}
</script>

<style lang="scss" scoped>
.sound-container {
  height: 48px;
  width: 48px;
}
</style>
