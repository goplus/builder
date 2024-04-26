<template>
  <div class="container">
    <div v-if="scratchAssets.sprites.length">
      <div>
        {{
          $t({
            en: 'Sprites',
            zh: '精灵'
          })
        }}
      </div>
      <NGrid cols="6" x-gap="8" y-gap="8">
        <NGridItem
          v-for="asset in scratchAssets.sprites"
          :key="asset.name"
          @click="selectSprite(asset)"
        >
          <ScratchItemContainer :selected="selected.sprites.has(asset)">
            <div class="asset-image">
              <BlobImage :blob="asset.costumes[0].blob" />
            </div>
            <div class="asset-name">{{ asset.name }}</div>
          </ScratchItemContainer>
        </NGridItem>
      </NGrid>
    </div>
    <div v-if="scratchAssets.sounds.length">
      <div>
        {{
          $t({
            en: 'Sounds',
            zh: '声音'
          })
        }}
      </div>
      <NGrid cols="6" x-gap="8" y-gap="8">
        <NGridItem
          v-for="asset in scratchAssets.sounds"
          :key="asset.name"
          @click="selectSound(asset)"
        >
          <SoundItem :asset="asset" :selected="selected.sounds.has(asset)" />
        </NGridItem>
      </NGrid>
    </div>

    <div v-if="scratchAssets.backdrops.length">
      <div>
        {{
          $t({
            en: 'Backdrops',
            zh: '背景'
          })
        }}
      </div>
      <NGrid cols="6" x-gap="8" y-gap="8">
        <NGridItem
          v-for="asset in scratchAssets.backdrops"
          :key="asset.name"
          @click="selectBackdrop(asset)"
        >
          <ScratchItemContainer :selected="selected.backdrops.has(asset)">
            <div class="asset-image">
              <BlobImage :blob="asset.blob" />
            </div>
            <div class="asset-name">{{ asset.name }}</div>
          </ScratchItemContainer>
        </NGridItem>
      </NGrid>
    </div>
    <UIButton size="large" class="import-button" @click="importSelected">
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
import { NGrid, NGridItem } from 'naive-ui'
import { Sprite } from '@/models/sprite'
import { type ExportedScratchAssets, type ExportedScratchFile } from '@/utils/scratch'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { File as LazyFile } from '@/models/common/file'
import BlobImage from '../BlobImage.vue'
import type { ExportedScratchSprite } from '@/utils/scratch'
import type { Project } from '@/models/project'
import { ref, watch } from 'vue'
import { UIButton, useMessage } from '@/components/ui'
import ScratchItemContainer from './ScratchItemContainer.vue'
import SoundItem from './SoundItem.vue'

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
.container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--ui-color-grey-1000);
}

.import-button {
  align-self: flex-end;
}

.asset-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
}

.asset-image {
  flex: 1;
  display: flex;
  align-items: center;
  overflow: hidden;

  & > img {
    max-width: 100%;
    max-height: 100%;
    border-radius: var(--ui-border-radius-1);
  }
}
</style>
