<script setup lang="ts">
import { debounce } from 'lodash'

import type { Project } from '@/models/project'
import type { Physics } from '@/models/stage'

import { UISwitch } from '@/components/ui'
import MapConfigItemWrapper from './MapConfigItemWrapper.vue'

const props = defineProps<{
  project: Project
}>()

function applyPhysicsProps(physics: Partial<Physics>) {
  const oldPhysics = props.project.stage.physics
  props.project.stage.setPhysics({ ...oldPhysics, ...physics })
}

const handlePhysicsEnabledChange = debounce((v: boolean) => {
  props.project.history.doAction(
    { name: { en: `Configure map physics ${v ? 'enable' : 'disable'}`, zh: `修改地图物理特性${v ? '启用' : '禁用'}` } },
    () => applyPhysicsProps({ enabled: v })
  )
}, 300)
</script>

<template>
  <MapConfigItemWrapper :title="$t({ en: 'Physics', zh: '物理特性' })">
    <UISwitch
      v-radar="{ name: 'physics input', desc: 'Input to set map physics' }"
      :value="project.stage.physics?.enabled"
      @update:value="handlePhysicsEnabledChange"
    />
  </MapConfigItemWrapper>
</template>

<style lang="scss" scoped></style>
