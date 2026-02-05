<script lang="ts" setup>
import { watchEffect } from 'vue'
import type { Size } from '@/models/common'
import type { Widget } from '@/models/widget'
import MonitorNode from './MonitorNode.vue'
import { Monitor } from '@/models/widget/monitor'
import { getNodeId } from '@/components/editor/common/viewer/common'
import type { WidgetLocalConfig } from '@/components/editor/common/viewer/quick-config/utils'

const props = defineProps<{
  widget: Widget
  localConfig: WidgetLocalConfig | null
  viewportSize: Size
  nodeReadyMap: Map<string, boolean>
}>()

// TODO: when there are more widget types, we may extract more common logic for reuse
watchEffect((onCleanup) => {
  const nodeId = getNodeId(props.widget)
  props.nodeReadyMap.set(nodeId, true)
  onCleanup(() => props.nodeReadyMap.delete(nodeId))
})
</script>

<template>
  <MonitorNode
    v-if="widget instanceof Monitor"
    :monitor="widget"
    :local-config="localConfig"
    :viewport-size="viewportSize"
    :node-ready-map="nodeReadyMap"
  ></MonitorNode>
</template>
