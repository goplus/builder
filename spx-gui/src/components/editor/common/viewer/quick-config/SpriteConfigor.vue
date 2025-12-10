<script lang="ts" setup>
import { inject, toValue, watch } from 'vue'

import DefaultConfig from './sprite/DefaultConfig.vue'
import { RotationStyle, type Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import SizeConfig from './sprite/SizeConfig.vue'
import HeadingConfig from './sprite/HeadingConfig.vue'
import PositionConfig from './sprite/PositionConfig.vue'
import { configTypeInjectionKey, updateConfigTypeInjectionKey } from './QuickConfig.vue'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const configType = inject(configTypeInjectionKey)
const update = inject(updateConfigTypeInjectionKey)

watch(
  () => props.sprite,
  () => {
    if (toValue(configType) === 'rotate' && props.sprite.rotationStyle === RotationStyle.LeftRight) {
      update?.(['default'])
    }
  }
)
</script>

<template>
  <SizeConfig v-if="configType === 'size'" :sprite="sprite" :project="project" />
  <HeadingConfig v-else-if="configType === 'rotate'" :sprite="sprite" :project="project" />
  <PositionConfig v-else-if="configType === 'pos'" :sprite="sprite" :project="project" />
  <DefaultConfig v-else-if="configType === 'default'" :sprite="sprite" :project="project" />
</template>

<style lang="scss" scoped></style>
