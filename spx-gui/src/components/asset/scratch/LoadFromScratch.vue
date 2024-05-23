<template>
  <div class="container">
    <div v-if="scratchAssets.sprites.length">
      <h4 class="title">{{ $t({ en: 'Sprites', zh: '精灵' }) }}</h4>
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
      <h4 class="title">{{ $t({ en: 'Sounds', zh: '声音' }) }}</h4>
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
      <h4 class="title">{{ $t({ en: 'Backdrops', zh: '背景' }) }}</h4>
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
    <UIButton
      size="large"
      class="import-button"
      :loading="importSelected.isLoading.value"
      @click="importSelected.fn"
    >
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
import { ref, watch } from 'vue'
import { NGrid, NGridItem } from 'naive-ui'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import { type ExportedScratchAssets, type ExportedScratchFile } from '@/utils/scratch'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { fromBlob } from '@/models/common/file'
import { useMessageHandle } from '@/utils/exception'
import type { ExportedScratchSprite } from '@/utils/scratch'
import type { Project } from '@/models/project'
import type { AssetModel } from '@/models/common/asset'
import { UIButton } from '@/components/ui'
import BlobImage from '../BlobImage.vue'
import ScratchItemContainer from './ScratchItemContainer.vue'
import SoundItem from './SoundItem.vue'

const props = defineProps<{
  scratchAssets: ExportedScratchAssets
  project: Project
}>()

const emit = defineEmits<{
  imported: [AssetModel[]]
}>()

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
    selected.value.backdrops.add(backdrop)
  }
}

const scratchToSpxFile = (scratchFile: ExportedScratchFile) => {
  return fromBlob(`${scratchFile.name}.${scratchFile.extension}`, scratchFile.blob)
}

const importSprite = async (asset: ExportedScratchSprite) => {
  const costumes = await Promise.all(
    asset.costumes.map((costume) => Costume.create(costume.name, scratchToSpxFile(costume)))
  )
  const sprite = Sprite.create(asset.name)
  for (const costume of costumes) {
    sprite.addCostume(costume)
  }
  props.project.addSprite(sprite)
  await sprite.autoFit()
  return sprite
}

const importSound = async (asset: ExportedScratchFile) => {
  const file = scratchToSpxFile(asset)
  const sound = await Sound.create(asset.name, file)
  props.project.addSound(sound)
  return sound
}

const importBackdrop = async (asset: ExportedScratchFile) => {
  const file = scratchToSpxFile(asset)
  const backdrop = await Backdrop.create(asset.name, file)
  props.project.stage.addBackdrop(backdrop)
  return backdrop
}

const importSelected = useMessageHandle(
  async () => {
    const { sprites, sounds, backdrops } = selected.value
    const imported = await Promise.all([
      ...Array.from(sprites).map(importSprite),
      ...Array.from(sounds).map(importSound),
      ...Array.from(backdrops).map(importBackdrop)
    ])
    emit('imported', imported)
  },
  // TODO: more detailed error message
  { en: 'Error encountered when importing assets', zh: '素材导入遇到错误' },
  { en: 'Assets imprted', zh: '素材导入成功' }
)
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--ui-color-grey-1000);
}

.title {
  margin-bottom: 8px;
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
