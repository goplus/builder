<script lang="ts" setup>
import { inject } from 'vue'

import DefaultConfigPanel from './sprite/DefaultConfigPanel.vue'
import type { Project } from '@/models/project'
import SizeConfigPanel from './common/SizeConfigPanel.vue'
import HeadingConfigPanel from './sprite/HeadingConfigPanel.vue'
import PositionConfigPanel from './common/PositionConfigPanel.vue'
import { configTypeInjectionKey } from './QuickConfigWrapper.vue'
import type { SpriteLocalConfig } from './utils'

defineProps<{
  localConfig: SpriteLocalConfig
  project: Project
}>()

const configType = inject(configTypeInjectionKey)
</script>

<template>
  <template v-if="configType != null">
    <SizeConfigPanel v-if="configType === 'size'" name="sprite" :local-config="localConfig" />
    <HeadingConfigPanel v-else-if="configType === 'rotate'" :local-config="localConfig" />
    <PositionConfigPanel v-else-if="configType === 'pos'" name="sprite" :local-config="localConfig" />
    <DefaultConfigPanel v-else-if="configType === 'default'" :local-config="localConfig" :project="project" />
  </template>
</template>

<style lang="scss" scoped></style>
