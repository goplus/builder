<script lang="ts" setup>
import { inject, watch } from 'vue'

import type { Project } from '@/models/project'
import type { KonvaEventObject, Node, NodeConfig } from 'konva/lib/Node'
import { closeInjectionKey, openInjectionKey } from './QuickConfig.vue'
import { throttle } from 'lodash'
import type { Widget } from '@/models/widget'
import DefaultConfig from './widget/DefaultConfig.vue'
import { round } from '@/utils/utils'
import type { Size } from '@/models/common'
import SizeConfig from './widget/SizeConfig.vue'
import PositionConfig from './widget/PositionConfig.vue'

const props = defineProps<{
  type?: string | null
  node?: Node<NodeConfig> | null
  widget: Widget
  mapSize: Size
  project: Project
}>()

const open = inject(openInjectionKey)
const close = inject(closeInjectionKey)

function toPosition(e: KonvaEventObject<unknown>) {
  const x = round(e.target.x() - props.mapSize.width / 2)
  const y = round(props.mapSize.height / 2 - e.target.y())
  return { x, y }
}

function toSize(e: KonvaEventObject<unknown>) {
  const size = round(e.target.scaleX(), 2)
  return size
}

watch(
  () => props.node,
  (node, _, onCleanup) => {
    if (node == null) {
      close?.()
      return
    }

    const openDefault = () => {
      if (props.type === 'default') {
        close?.()
      } else {
        open?.('default')
      }
    }
    const notifyConfigorOnSpriteChange = throttle((e: KonvaEventObject<unknown>) => {
      const { widget } = props

      const size = toSize(e)
      if (size != widget.size) {
        open?.('size', openDefault)
        return
      }

      const { x, y } = toPosition(e)
      if (widget.x !== x || widget.y !== y) {
        open?.('pos', openDefault)
      }
    }, 200)

    node.on('dragmove', notifyConfigorOnSpriteChange)
    node.on('transform', notifyConfigorOnSpriteChange)
    node.on('openconfigor', openDefault)
    onCleanup(() => {
      node.off('dragmove', notifyConfigorOnSpriteChange)
      node.off('transform', notifyConfigorOnSpriteChange)
      node.off('openconfigor', openDefault)
    })
  },
  {
    immediate: true
  }
)
</script>

<template>
  <SizeConfig v-if="type === 'size'" :widget="widget" :project="project" />
  <PositionConfig v-else-if="type === 'pos'" :widget="widget" :project="project" />
  <DefaultConfig v-else-if="type === 'default'" :widget="widget" :project="project" />
</template>

<style lang="scss" scoped></style>
