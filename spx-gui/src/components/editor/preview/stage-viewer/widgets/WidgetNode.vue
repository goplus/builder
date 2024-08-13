<template>
  <MonitorNode
    v-if="widget instanceof Monitor"
    :monitor="widget"
    :map-size="mapSize"
    :node-ready-map="nodeReadyMap"
  ></MonitorNode>
</template>
<script lang="ts" setup>
import { watchEffect } from 'vue'
import type { Size } from '@/models/common'
import type { Widget } from '@/models/widget'
import MonitorNode from './MonitorNode.vue'
import { Monitor } from '@/models/widget/monitor'
import { getNodeName } from '../node'

const props = defineProps<{
  widget: Widget
  mapSize: Size
  nodeReadyMap: Map<string, boolean>
}>()

// TODO: when there are more widget types, we may extract more common logic for reuse
watchEffect((onCleanup) => {
  const nodeName = getNodeName(props.widget)
  props.nodeReadyMap.set(nodeName, true)
  onCleanup(() => props.nodeReadyMap.delete(nodeName))
})
</script>
