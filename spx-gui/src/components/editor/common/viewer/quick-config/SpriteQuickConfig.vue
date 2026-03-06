<script lang="ts" setup>
import { watch } from 'vue'
import type { SpxProject } from '@/models/spx/project'
import DefaultConfigPanel from './sprite/DefaultConfigPanel.vue'
import SizeConfigPanel from './common/SizeConfigPanel.vue'
import RotationConfigPanel from './sprite/RotationConfigPanel.vue'
import PositionConfigPanel from './common/PositionConfigPanel.vue'
import { useQuickConfigContext } from './QuickConfigWrapper.vue'
import type { SpriteLocalConfig } from './utils'

const props = defineProps<{
  localConfig: SpriteLocalConfig
  project: SpxProject
}>()

const { configType, updateConfigType } = useQuickConfigContext()

watch(
  () => props.localConfig,
  () => updateConfigType('default'),
  { immediate: true }
)

function backToDefault() {
  updateConfigType('default')
}
</script>

<template>
  <SizeConfigPanel v-if="configType === 'size'" name="sprite" :local-config="localConfig" :on-back="backToDefault" />
  <RotationConfigPanel v-else-if="configType === 'rotation'" :local-config="localConfig" :on-back="backToDefault" />
  <PositionConfigPanel
    v-else-if="configType === 'pos'"
    name="sprite"
    :local-config="localConfig"
    :on-back="backToDefault"
  />
  <DefaultConfigPanel v-else-if="configType === 'default'" :local-config="localConfig" :project="project" />
</template>

<style lang="scss" scoped></style>
