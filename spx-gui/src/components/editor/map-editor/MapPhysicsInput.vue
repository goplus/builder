<script setup lang="ts">
import type { SpxProject } from '@/models/spx/project'
import type { Physics } from '@/models/spx/stage'

import { UISwitch } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  project: SpxProject
}>()

const editorCtx = useEditorCtx()

function applyPhysicsProps(physics: Partial<Physics>) {
  const oldPhysics = props.project.stage.physics
  props.project.stage.setPhysics({ ...oldPhysics, ...physics })
}

const handlePhysicsEnabledChange = (v: boolean) => {
  editorCtx.state.history.doAction(
    { name: { en: `Configure map physics ${v ? 'enable' : 'disable'}`, zh: `修改地图物理特性${v ? '启用' : '禁用'}` } },
    () => applyPhysicsProps({ enabled: v })
  )
}
</script>

<template>
  <UISwitch
    v-radar="{ name: 'physics input', desc: 'Input to set map physics' }"
    :value="project.stage.physics?.enabled"
    @update:value="handlePhysicsEnabledChange"
  />
</template>
