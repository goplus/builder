<script lang="ts" setup>
import { computed, inject, watch } from 'vue'

import DefaultConfig from './sprite/DefaultConfig.vue'
import { RotationStyle, type Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import SizeConfig from './sprite/SizeConfig.vue'
import HeadingConfig from './sprite/HeadingConfig.vue'
import PositionConfig from './sprite/PositionConfig.vue'
import type { KonvaEventObject, Node, NodeConfig } from 'konva/lib/Node'
import { closeInjectionKey, openInjectionKey } from './QuickConfig.vue'
import { normalizeDegree, round } from '@/utils/utils'
import type { Size } from '@/models/common'
import { throttle } from 'lodash'

const props = defineProps<{
  type?: string | null
  node?: Node<NodeConfig> | null
  sprite: Sprite
  mapSize: Size
  project: Project
}>()

const open = inject(openInjectionKey)
const close = inject(closeInjectionKey)

const costume = computed(() => props.sprite.defaultCostume)
const bitmapResolution = computed(() => costume.value?.bitmapResolution ?? 1)

// copy from SpriteNode.vue
function toPosition(e: KonvaEventObject<unknown>) {
  const { mapSize } = props
  const x = round(e.target.x() - mapSize.width / 2)
  const y = round(mapSize.height / 2 - e.target.y())
  return { x, y }
}
function toHeading(e: KonvaEventObject<unknown>) {
  const { sprite } = props
  let heading = sprite.heading
  if (sprite.rotationStyle === RotationStyle.Normal || sprite.rotationStyle === RotationStyle.LeftRight) {
    heading = normalizeDegree(round(e.target.rotation() + 90))
  }
  return heading
}
function toSize(e: KonvaEventObject<unknown>) {
  const size = round(Math.abs(e.target.scaleX()) * bitmapResolution.value, 2)
  return size
}

watch(
  () => props.node,
  (node, _, onCleanup) => {
    if (node == null) {
      close?.()
      return
    }

    // Special handling for RotationStyle.LeftRight to avoid opening heading config when switching sprites
    if (props.type === 'heading' && props.sprite.rotationStyle === RotationStyle.LeftRight) {
      open?.('default')
    }

    const openDefault = () => {
      if (props.type === 'default') {
        close?.()
      } else {
        open?.('default')
      }
    }
    const notifyConfigorOnSpriteChange = throttle((e: KonvaEventObject<unknown>) => {
      const { sprite } = props

      const size = toSize(e)
      if (size != sprite.size) {
        open?.('size', openDefault)
        return
      }

      const heading = toHeading(e)
      if (sprite.heading !== heading) {
        open?.(sprite.rotationStyle === RotationStyle.LeftRight ? 'default' : 'heading', openDefault)
        return
      }

      const { x, y } = toPosition(e)
      if (sprite.x !== x || sprite.y !== y) {
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
  <SizeConfig v-if="type === 'size'" :sprite="sprite" :project="project" />
  <HeadingConfig v-else-if="type === 'heading'" :sprite="sprite" :project="project" />
  <PositionConfig v-else-if="type === 'pos'" :sprite="sprite" :project="project" />
  <DefaultConfig v-else-if="type === 'default'" :sprite="sprite" :project="project" />
</template>

<style lang="scss" scoped></style>
