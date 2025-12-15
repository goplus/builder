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
    if (props.sprite.rotationStyle === RotationStyle.LeftRight) {
      update?.(['default'])
    }
  }
)
</script>

<template>
  <SizeConfigPanel v-if="configType === 'size'" :sprite="sprite" :project="project" />
  <HeadingConfigPanel v-else-if="configType === 'rotate'" :sprite="sprite" :project="project" />
  <PositionConfigPanel v-else-if="configType === 'pos'" :sprite="sprite" :project="project" />
  <DefaultConfigPanel v-else-if="configType === 'default'" :sprite="sprite" :project="project" />
</template>

<style lang="scss" scoped></style>
