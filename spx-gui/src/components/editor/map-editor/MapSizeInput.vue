<script setup lang="ts">
import { debounce } from 'lodash'

import type { Project } from '@/models/project'

import { UINumberInput } from '@/components/ui'
import MapConfigItemWrapper from './MapConfigItemWrapper.vue'
import { defaultMapSize } from '@/models/stage'

const props = defineProps<{
  project: Project
}>()

const handleWidthChange = debounce((v: number | null) => {
  const action = { name: { en: `Configure map width`, zh: `修改地图宽度` } }
  props.project.history.doAction(action, () => props.project.stage.setMapWidth(v != null ? v : defaultMapSize.width))
}, 300)
const handleHeightChange = debounce((v: number | null) => {
  const action = { name: { en: `Configure map height`, zh: `修改地图高度` } }
  props.project.history.doAction(action, () => props.project.stage.setMapHeight(v != null ? v : defaultMapSize.height))
}, 300)
</script>

<template>
  <MapConfigItemWrapper :title="$t({ en: 'Map size', zh: '地图尺寸' })">
    <div class="inputs">
      <UINumberInput
        v-radar="{ name: 'width input', desc: 'Input to set map width' }"
        :value="project.stage.mapWidth"
        @update:value="handleWidthChange"
      >
        <template #prefix>{{ $t({ en: 'Width', zh: '宽' }) }}:</template>
      </UINumberInput>
      <UINumberInput
        v-radar="{ name: 'height input', desc: 'Input to set map height' }"
        :value="project.stage.mapHeight"
        @update:value="handleHeightChange"
      >
        <template #prefix>{{ $t({ en: 'Height', zh: '高' }) }}:</template>
      </UINumberInput>
    </div>
  </MapConfigItemWrapper>
</template>

<style lang="scss" scoped>
.inputs {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
</style>
