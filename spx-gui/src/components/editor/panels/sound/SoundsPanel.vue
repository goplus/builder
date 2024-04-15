<template>
  <div v-show="props.active" class="sounds-details">
    <NInput placeholder="TODO" />
    <AssetAddBtn :type="AssetType.Sound" />
    <SoundEditCard
      v-for="asset in editorCtx.project.sounds"
      :key="asset.name"
      :asset="asset"
      @click="handleSelect(asset)"
      @remove="handleRemoveSound(asset)"
    />
  </div>
  <UICardHeader v-show="!props.active">Sounds</UICardHeader>
</template>

<script setup lang="ts">
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import type { Sound } from '@/models/sound'
import AssetAddBtn from '../todo/AssetAddBtn.vue'
import SoundEditCard from '@/components/editor/sound/SoundEditCard.vue'
import { NInput } from 'naive-ui'
import { UICardHeader } from '@/components/ui'

const editorCtx = useEditorCtx()

const props = defineProps<{
  active: boolean
}>()

const handleSelect = (asset: Sound) => {
  editorCtx.select('sound', asset.name)
}

const handleRemoveSound = (asset: Sound) => {
  editorCtx.project.removeSound(asset.name)
}
</script>

<style scoped lang="scss"></style>
