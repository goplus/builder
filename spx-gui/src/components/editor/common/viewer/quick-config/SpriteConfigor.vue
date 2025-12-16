<script lang="ts" setup>
import { inject, watch } from 'vue'

import DefaultConfigPanel from './sprite/DefaultConfigPanel.vue'
import { RotationStyle, type Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import SizeConfigPanel from './sprite/SizeConfigPanel.vue'
import HeadingConfigPanel from './sprite/HeadingConfigPanel.vue'
import PositionConfigPanel from './sprite/PositionConfigPanel.vue'
import { configTypeInjectionKey, updateConfigTypeInjectionKey } from './QuickConfig.vue'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const configType = inject(configTypeInjectionKey)
const update = inject(updateConfigTypeInjectionKey)

watch(
  () => props.sprite.rotationStyle,
  () => {
    // If the selected sprite's rotationStyle is LeftRight, it needs to be restored to default immediately
    if (props.sprite.rotationStyle === RotationStyle.LeftRight) {
      update?.([{ type: 'default' }])
    }
  }
)
</script>

<template>
  <SizeConfigPanel v-if="configType?.type === 'size'" :sprite="sprite" :project="project" :size="configType?.size" />
  <HeadingConfigPanel
    v-else-if="configType?.type === 'rotate'"
    :sprite="sprite"
    :project="project"
    :heading="configType?.rotate"
  />
  <PositionConfigPanel
    v-else-if="configType?.type === 'pos'"
    :sprite="sprite"
    :project="project"
    :x="configType?.x"
    :y="configType?.y"
  />
  <DefaultConfigPanel v-else-if="configType?.type === 'default'" :sprite="sprite" :project="project" />
</template>

<style lang="scss" scoped></style>
