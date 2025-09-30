<script setup lang="ts">
import type { Project } from '@/models/project'
import { LayerSortMode } from '@/models/stage'

import { UIRadioWithTooltip, UIRadioGroup } from '@/components/ui'
import MapConfigItem from '../common/config/MapConfigItem.vue'

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
  <MapConfigItem :title="$t({ en: 'Layer Sorting', zh: '层级排序' })">
    <UIRadioGroup :value="props.project.stage.layerSortMode" @update:value="handleLayerSortModeChange">
      <UIRadioWithTooltip
        :value="LayerSortMode.Default"
        :tooltip="
          $t({ en: 'Sprites will be rendered in the specified sorting order', zh: '精灵将按照设置的顺序进行渲染' })
        "
      >
        {{ $t({ en: 'Default', zh: '默认' }) }}
      </UIRadioWithTooltip>
      <UIRadioWithTooltip
        :value="LayerSortMode.Vertical"
        :tooltip="
          $t({
            en: 'Sprites with lower Y coordinates will be rendered above those with higher Y coordinates',
            zh: 'Y 坐标较低的精灵将渲染在 Y 坐标较高的精灵之上'
          })
        "
      >
        {{ $t({ en: 'Vertical', zh: '垂直' }) }}
      </UIRadioWithTooltip>
    </UIRadioGroup>
  </MapConfigItem>
</template>

<style lang="scss" scoped></style>
