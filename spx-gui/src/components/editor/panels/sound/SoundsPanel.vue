<template>
  <CommonPanel
    :expanded="expanded"
    :active="editorCtx.selectedSound != null"
    :title="$t({ en: 'Sounds', zh: '声音' })"
    :color="uiVariables.color.sound"
    @expand="emit('expand')"
  >
    <template #details>
      <NInput placeholder="TODO" />
      <AssetAddBtn :type="AssetType.Sound" />
      <SoundEditCard
        v-for="asset in editorCtx.project.sounds"
        :key="asset.name"
        :asset="asset"
        @click="handleSelect(asset)"
        @remove="handleRemoveSound(asset)"
      />
    </template>
    <template #summary> Sounds </template>
  </CommonPanel>
</template>

<script setup lang="ts">
import { NInput } from 'naive-ui'
import { useUIVariables } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import type { Sound } from '@/models/sound'
import SoundEditCard from '@/components/editor/sound/SoundEditCard.vue'
import CommonPanel from '../common/CommonPanel.vue'
import AssetAddBtn from '../todo/AssetAddBtn.vue'

const editorCtx = useEditorCtx()

defineProps<{
  expanded: boolean
}>()

const emit = defineEmits<{
  expand: []
}>()

const uiVariables = useUIVariables()

const handleSelect = (asset: Sound) => {
  editorCtx.select('sound', asset.name)
}

const handleRemoveSound = (asset: Sound) => {
  editorCtx.project.removeSound(asset.name)
}
</script>

<style scoped lang="scss"></style>
