<template>
  <div>
    <template v-if="scratchAssets.sprites.length">
      <div>Sprites</div>
      <NGrid cols="6">
        <NGridItem
          v-for="asset in scratchAssets.sprites"
          :key="asset.name"
          :class="['file-row', { selected: selected.sprites.has(asset) }]"
          @click="selectSprite(asset)"
        >
          <div>{{ asset.name }}</div>
          <BlobImage
            preview-disabled
            width="80"
            height="80"
            :fallback-src="error"
            :blob="asset.costumes[0].blob"
          />
        </NGridItem>
      </NGrid>
    </template>
    <div>Sounds</div>
    <NGrid cols="6">
      <NGridItem
        v-for="asset in scratchAssets.sounds"
        :key="asset.name"
        :class="['file-row', { selected: selected.sounds.has(asset) }]"
        @click="selectSound(asset)"
      >
        <div>{{ asset.filename }}</div>
        <div class="sound-container">
          <BlobSoundPlayer :blob="asset.blob" />
        </div>
      </NGridItem>
    </NGrid>
    <div>Backdrops</div>
    <NGrid cols="6">
      <NGridItem
        v-for="asset in scratchAssets.backdrops"
        :key="asset.name"
        :class="['file-row', { selected: selected.backdrops.has(asset) }]"
        @click="selectBackdrop(asset)"
      >
        <div>{{ asset.filename }}</div>
        <BlobImage
          :blob="asset.blob"
          preview-disabled
          width="80"
          height="80"
          :fallback-src="error"
        />
      </NGridItem>
    </NGrid>
    <UIButton @click="importSelected">
      {{
        $t({
          en: 'Import',
          zh: '导入'
        })
      }}
    </UIButton>
  </div>
</template>

<script setup lang="ts">
import { Sound } from '@/models/sound'
import { NGrid, NGridItem, useMessage } from 'naive-ui'
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
import { ref, watch } from 'vue'
import { UIButton } from '../ui'

const props = defineProps<{
  scratchAssets: ExportedScratchAssets
  project: Project
}>()

const emit = defineEmits<{
  imported: []
}>()

const message = useMessage()

const selected = ref<{
  backdrops: Set<ExportedScratchFile>
  sounds: Set<ExportedScratchFile>
  sprites: Set<ExportedScratchSprite>
}>({
  backdrops: new Set(),
  sounds: new Set(),
  sprites: new Set()
})

watch(
  () => props.scratchAssets,
  () => {
    selected.value = {
      backdrops: new Set(),
      sounds: new Set(),
      sprites: new Set()
    }
  }
)

const selectSprite = (sprite: ExportedScratchSprite) => {
  if (selected.value.sprites.has(sprite)) {
    selected.value.sprites.delete(sprite)
  } else {
    selected.value.sprites.add(sprite)
  }
}

const selectSound = (sound: ExportedScratchFile) => {
  if (selected.value.sounds.has(sound)) {
    selected.value.sounds.delete(sound)
  } else {
    selected.value.sounds.add(sound)
  }
}

const selectBackdrop = (backdrop: ExportedScratchFile) => {
  if (selected.value.backdrops.has(backdrop)) {
    selected.value.backdrops.delete(backdrop)
  } else {
    if (selected.value.backdrops.size >= 1) {
      selected.value.backdrops.clear()
    }
    selected.value.backdrops.add(backdrop)
  }
}

const scratchToSpxFile = (scratchFile: ExportedScratchFile) => {
  return new LazyFile(
    `${scratchFile.name}.${scratchFile.extension}`,
    () => scratchFile.blob.arrayBuffer(),
    {}
  )
}

const importSprite = (asset: ExportedScratchSprite) => {
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

const importSound = (asset: ExportedScratchFile) => {
  const file = scratchToSpxFile(asset)
  const sound = Sound.create(asset.name, file)
  props.project.addSound(sound)
  message.success(`Imported sound ${file.name}`)
}

const importBackdrop = (asset: ExportedScratchFile) => {
  const file = scratchToSpxFile(asset)
  const backdrop = Backdrop.create(asset.name, file)
  props.project.stage.setBackdrop(backdrop)
  message.success(`Imported backdrop ${file.name}`)
}

const importSelected = () => {
  for (const sprite of selected.value.sprites) {
    importSprite(sprite)
  }
  for (const sound of selected.value.sounds) {
    importSound(sound)
  }
  for (const backdrop of selected.value.backdrops) {
    importBackdrop(backdrop)
  }
  emit('imported')
}
</script>

<style lang="scss" scoped>
.sound-container {
  height: 48px;
  width: 48px;
}

.selected {
  background-color: #f0f0f0;
}
</style>
