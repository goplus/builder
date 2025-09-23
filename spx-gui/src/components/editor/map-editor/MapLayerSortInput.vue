<script setup lang="ts">
import type { Project } from '@/models/project'
import { LayerSortMode } from '@/models/stage'

import { UIRadio, UIRadioGroup } from '@/components/ui'
import MapConfigItemWrapper from './MapConfigItemWrapper.vue'

const props = defineProps<{
  project: Project
}>()

const handleLayerSortModeChange = (v: string | null) => {
  props.project.history.doAction(
    {
      name: {
        en: `Configure map layer sorting to ${v === LayerSortMode.Default ? 'default' : 'vertical'}`,
        zh: `修改地图层级排序为${v === LayerSortMode.Default ? '默认' : '垂直'}`
      }
    },
    () => props.project.stage.setLayerSortMode(v === LayerSortMode.Vertical ? v : LayerSortMode.Default)
  )
}
</script>

<template>
  <MapConfigItemWrapper
    :title="$t({ en: 'Layer Sorting', zh: '层级排序' })"
    :question="
      $t({
        zh: `• 默认：精灵将按照设置的顺序进行渲染
• 垂直：Y 坐标较低的精灵将渲染在 Y 坐标较高的精灵之上`,
        en: `• Default: Sprites will be rendered in the specified sorting order
• Vertical: Sprites with lower Y coordinates will be rendered above those with higher Y coordinates`
      })
    "
  >
    <UIRadioGroup :value="props.project.stage.layerSortMode" @update:value="handleLayerSortModeChange">
      <UIRadio :value="LayerSortMode.Default">
        {{ $t({ en: 'Default', zh: '默认' }) }}
      </UIRadio>
      <UIRadio :value="LayerSortMode.Vertical">
        {{ $t({ en: 'Vertical', zh: '垂直' }) }}
      </UIRadio>
    </UIRadioGroup>
  </MapConfigItemWrapper>
</template>

<style lang="scss" scoped></style>
