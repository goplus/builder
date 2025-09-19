<script setup lang="ts">
import type { Project } from '@/models/project'
import { LayerSortMode } from '@/models/stage'

import { UISwitch } from '@/components/ui'
import MapConfigItemWrapper from './MapConfigItemWrapper.vue'

const props = defineProps<{
  project: Project
}>()

const handleLayerSortModeChange = (v: boolean) => {
  props.project.history.doAction(
    {
      name: {
        en: `Configure map layer sorting ${v ? 'enable' : 'disable'}`,
        zh: `修改地图层级排序${v ? '启用' : '禁用'}`
      }
    },
    () => props.project.stage.setLayerSortMode(v ? LayerSortMode.Vertical : LayerSortMode.Normal)
  )
}
</script>

<template>
  <MapConfigItemWrapper :title="$t({ en: 'Layer Sorting', zh: '层级排序' })">
    <UISwitch
      v-radar="{ name: 'layer sorting input', desc: 'Input to set layer sorting' }"
      :value="project.stage.layerSortMode !== LayerSortMode.Normal"
      @update:value="handleLayerSortModeChange"
    />
  </MapConfigItemWrapper>
</template>

<style lang="scss" scoped></style>
