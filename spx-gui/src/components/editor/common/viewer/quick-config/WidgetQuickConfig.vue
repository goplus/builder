<script lang="ts" setup>
import { watch } from 'vue'
import type { SpxProject } from '@/models/spx/project'
import DefaultConfigPanel from './widget/DefaultConfigPanel.vue'
import SizeConfigPanel from './common/SizeConfigPanel.vue'
import PositionConfigPanel from './common/PositionConfigPanel.vue'
import { useQuickConfigContext } from './QuickConfigWrapper.vue'
import type { WidgetLocalConfig } from './utils'

const props = defineProps<{
  localConfig: WidgetLocalConfig
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
  <SizeConfigPanel v-if="configType === 'size'" name="monitor" :local-config="localConfig" :on-back="backToDefault" />
  <PositionConfigPanel
    v-else-if="configType === 'pos'"
    name="monitor"
    :local-config="localConfig"
    :on-back="backToDefault"
  />
  <DefaultConfigPanel v-else-if="configType === 'default'" :local-config="localConfig" :project="project" />
</template>

<style lang="scss" scoped></style>
