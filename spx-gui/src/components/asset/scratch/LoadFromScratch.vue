<template>
  <div class="container">
    <div v-if="scratchAssets.sprites.length">
      <h4 class="title">{{ $t({ en: 'Sprites', zh: '精灵' }) }}</h4>
      <NGrid cols="6" x-gap="8" y-gap="8">
        <NGridItem v-for="asset in scratchAssets.sprites" :key="asset.name" @click="selectSprite(asset)">
          <SpriteItem :asset="asset" :selected="selected.sprites.has(asset)" />
        </NGridItem>
      </NGrid>
    </div>
    <div v-if="scratchAssets.sounds.length">
      <h4 class="title">{{ $t({ en: 'Sounds', zh: '声音' }) }}</h4>
      <NGrid cols="6" x-gap="8" y-gap="8">
        <NGridItem v-for="asset in scratchAssets.sounds" :key="asset.name" @click="selectSound(asset)">
          <SoundItem :asset="asset" :selected="selected.sounds.has(asset)" />
        </NGridItem>
      </NGrid>
    </div>

    <div v-if="scratchAssets.backdrops.length">
      <h4 class="title">{{ $t({ en: 'Backdrops', zh: '背景' }) }}</h4>
      <NGrid cols="6" x-gap="8" y-gap="8">
        <NGridItem v-for="asset in scratchAssets.backdrops" :key="asset.name" @click="selectBackdrop(asset)">
          <BackdropItem :asset="asset" :selected="selected.backdrops.has(asset)" />
        </NGridItem>
      </NGrid>
    </div>
    <UIButton
      v-radar="{ name: 'Import button', desc: 'Click to import selected assets from Scratch' }"
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
import { shallowReactive, watch } from 'vue'
import { NGrid, NGridItem } from 'naive-ui'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import { type ExportedScratchAssets, type ExportedScratchFile } from '@/utils/scratch'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { fromBlob } from '@/models/common/file'
import { useMessageHandle } from '@/utils/exception'
import type { ExportedScratchCostume, ExportedScratchSound, ExportedScratchSprite } from '@/utils/scratch'
import { type Project } from '@/models/project'
import type { AssetModel } from '@/models/common/asset'
import { UIButton } from '@/components/ui'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'

const props = defineProps<{
  scratchAssets: ExportedScratchAssets
  project: Project
}>()

const emit = defineEmits<{
  imported: [AssetModel[]]
}>()

const selected = {
  backdrops: shallowReactive(new Set<ExportedScratchCostume>()),
  sounds: shallowReactive(new Set<ExportedScratchSound>()),
  sprites: shallowReactive(new Set<ExportedScratchSprite>())
}

watch(
  () => props.scratchAssets,
  () => {
    selected.backdrops.clear()
    selected.sounds.clear()
    selected.sprites.clear()
  }
)

const selectSprite = (sprite: ExportedScratchSprite) => {
  if (selected.sprites.has(sprite)) {
    selected.sprites.delete(sprite)
  } else {
    selected.sprites.add(sprite)
  }
}

const selectSound = (sound: ExportedScratchSound) => {
  if (selected.sounds.has(sound)) {
    selected.sounds.delete(sound)
  } else {
    selected.sounds.add(sound)
  }
}

const selectBackdrop = (backdrop: ExportedScratchCostume) => {
  if (selected.backdrops.has(backdrop)) {
    selected.backdrops.delete(backdrop)
  } else {
    selected.backdrops.add(backdrop)
  }
}

const scratchToSpxFile = (scratchFile: ExportedScratchFile) => {
  return fromBlob(`${scratchFile.name}.${scratchFile.extension}`, scratchFile.blob)
}

const importSprite = async (asset: ExportedScratchSprite) => {
  const costumes = await Promise.all(
    asset.costumes.map((costume) =>
      Costume.create(costume.name, scratchToSpxFile(costume), {
        bitmapResolution: costume.bitmapResolution,
        pivot: {
          x: costume.rotationCenterX / costume.bitmapResolution,
          y: costume.rotationCenterY / costume.bitmapResolution
        }
      })
    )
  )
  const sprite = Sprite.create(asset.name)
  for (const costume of costumes) {
    sprite.addCostume(costume)
  }
  props.project.addSprite(sprite)
  await sprite.autoFit()
  return sprite
}

const importSound = async (asset: ExportedScratchSound) => {
  const file = scratchToSpxFile(asset)
  const sound = await Sound.create(asset.name, file)
  props.project.addSound(sound)
  return sound
}

const importBackdrop = async (asset: ExportedScratchCostume) => {
  const file = scratchToSpxFile(asset)
  const backdrop = await Backdrop.create(asset.name, file, {
    bitmapResolution: asset.bitmapResolution
  })
  props.project.stage.addBackdrop(backdrop)
  return backdrop
}

const importSelected = useMessageHandle(
  async () => {
    const { sprites, sounds, backdrops } = selected
    const action = { name: { en: 'Import from Scratch file', zh: '从 Scratch 项目文件导入' } }
    const imported = await props.project.history.doAction(action, () =>
      Promise.all([
        ...Array.from(sprites).map(importSprite),
        ...Array.from(sounds).map(importSound),
        ...Array.from(backdrops).map(importBackdrop)
      ])
    )
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
</style>
