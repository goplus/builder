<script setup lang="ts">
import { debounce } from 'lodash'

import type { Project } from '@/models/project'

import { UINumberInput } from '@/components/ui'
import ConfigItemWrapper from '@/components/editor/common/config/ConfigItemWrapper.vue'

const props = defineProps<{
  project: Project
}>()

const handleWidthChange = debounce((v) => {
  const action = { name: { en: `Configure Map Width`, zh: `修改地图 宽度` } }
  props.project.history.doAction(action, () => props.project.stage.setMapWidth(v))
}, 300)
const handleHeightChange = debounce((v) => {
  const action = { name: { en: `Configure Map Height`, zh: `修改地图 高度` } }
  props.project.history.doAction(action, () => props.project.stage.setMapHeight(v))
}, 300)
</script>

<template>
  <ConfigItemWrapper :title="$t({ en: 'Size', zh: '尺寸' })">
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
  </ConfigItemWrapper>
</template>

<style lang="scss" scoped>
.inputs {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
</style>
