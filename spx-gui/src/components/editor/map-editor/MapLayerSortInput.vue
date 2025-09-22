<script setup lang="ts">
import type { Project } from '@/models/project'
import { LayerSortMode } from '@/models/stage'

import { UIRadio, UIRadioGroup, UITooltip } from '@/components/ui'
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
    () => props.project.stage.setLayerSortMode(v as LayerSortMode)
  )
}
</script>

<template>
  <MapConfigItemWrapper :title="$t({ en: 'Layer Sorting', zh: '层级排序' })">
    <UIRadioGroup :value="props.project.stage.layerSortMode" @update:value="handleLayerSortModeChange">
      <UITooltip>
        <template #trigger>
          <UIRadio :value="LayerSortMode.Default">
            {{ $t({ en: 'Default', zh: '默认' }) }}
          </UIRadio>
        </template>
        {{
          $t({
            en: 'Sprites will be rendered in the specified sorting order',
            zh: '精灵将按照设置的顺序进行渲染'
          })
        }}
      </UITooltip>
      <UITooltip>
        <template #trigger>
          <UIRadio :value="LayerSortMode.Vertical">
            {{ $t({ en: 'Vertical', zh: '垂直' }) }}
          </UIRadio>
        </template>
        {{
          $t({
            en: 'Sprites with higher Y coordinates will be rendered above those with lower Y coordinates',
            zh: 'Y 坐标较高的精灵将渲染在 Y 坐标较低的精灵之上'
          })
        }}
      </UITooltip>
    </UIRadioGroup>
  </MapConfigItemWrapper>
</template>

<style lang="scss" scoped></style>
