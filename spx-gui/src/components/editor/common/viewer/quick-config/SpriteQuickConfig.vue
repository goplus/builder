<script lang="ts" setup>
import { inject, watch } from 'vue'

import DefaultConfigPanel from './sprite/DefaultConfigPanel.vue'
import type { Project } from '@/models/project'
import SizeConfigPanel from './common/SizeConfigPanel.vue'
import HeadingConfigPanel from './sprite/HeadingConfigPanel.vue'
import PositionConfigPanel from './common/PositionConfigPanel.vue'
import { configTypeInjectionKey, updateConfigTypeInjectionKey } from './QuickConfigWrapper.vue'
import type { SpriteLocalConfig } from './utils'
import { RotationStyle } from '@/models/sprite'

const props = defineProps<{
  localConfig: SpriteLocalConfig
  project: Project
}>()

const configType = inject(configTypeInjectionKey)

const updateConfigType = inject(updateConfigTypeInjectionKey)
watch(
  () => props.localConfig.rotationStyle,
  () => {
    // If the selected sprite's rotationStyle is LeftRight or None, it needs to be restored to default immediately
    if ([RotationStyle.LeftRight, RotationStyle.None].includes(props.localConfig.rotationStyle)) {
      updateConfigType?.('default')
    }
  }
)
</script>

<template>
  <template v-if="configType != null">
    <SizeConfigPanel v-if="configType === 'size'" name="sprite" :local-config="localConfig" />
    <HeadingConfigPanel v-else-if="configType === 'heading'" :local-config="localConfig" />
    <PositionConfigPanel v-else-if="configType === 'pos'" name="sprite" :local-config="localConfig" />
    <DefaultConfigPanel v-else-if="configType === 'default'" :local-config="localConfig" :project="project" />
  </template>
</template>

<style lang="scss" scoped></style>
