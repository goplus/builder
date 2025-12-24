<script lang="ts" setup>
import { inject, watch } from 'vue'

import DefaultConfigPanel from './sprite/DefaultConfigPanel.vue'
import { RotationStyle, type Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import SizeConfigPanel from './sprite/SizeConfigPanel.vue'
import HeadingConfigPanel from './sprite/HeadingConfigPanel.vue'
import PositionConfigPanel from './sprite/PositionConfigPanel.vue'
import { configTypeInjectionKey, updateConfigTypesInjectionKey } from './QuickConfig.vue'

const props = defineProps<{
  sprite: Sprite
  project: Project
  size?: number
  heading?: number
  x?: number
  y?: number
}>()

defineEmits<{
  'update:size': [number]
  'update:heading': [number]
  'update:pos': [{ x: number; y: number }]
}>()

const configType = inject(configTypeInjectionKey)
const update = inject(updateConfigTypesInjectionKey)

watch(
  () => props.sprite.rotationStyle,
  () => {
    // If the selected sprite's rotationStyle is LeftRight, it needs to be restored to default immediately
    if (props.sprite.rotationStyle === RotationStyle.LeftRight) {
      update?.(['default'])
    }
  }
)
</script>

<template>
  <template v-if="configType != null">
    <SizeConfigPanel
      v-if="configType === 'size' && size != null"
      :sprite="sprite"
      :size="size"
      @update:size="$emit('update:size', $event)"
    />
    <HeadingConfigPanel
      v-else-if="configType === 'rotate' && heading != null"
      :sprite="sprite"
      :heading="heading"
      @update:heading="$emit('update:heading', $event)"
    />
    <PositionConfigPanel
      v-else-if="configType === 'pos' && x != null && y != null"
      :sprite="sprite"
      :x="x"
      :y="y"
      @update:pos="$emit('update:pos', $event)"
    />
    <DefaultConfigPanel v-else-if="configType === 'default'" :sprite="sprite" :project="project" />
  </template>
</template>

<style lang="scss" scoped></style>
