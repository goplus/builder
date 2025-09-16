<script setup lang="ts">
import { computed } from 'vue'
import { debounce, isFinite, toFinite } from 'lodash'

import type { Project, Action } from '@/models/project'
import type { Physics } from '@/models/stage'
import type { LocaleMessage } from '@/utils/i18n'

import { UINumberInput, UISwitch } from '@/components/ui'
import ConfigItemWrapper from '@/components/editor/common/config/ConfigItemWrapper.vue'

const props = defineProps<{
  project: Project
}>()

const disabled = computed(() => !props.project.stage.physics?.enabled)

function createDebouncedActionHandler<Args extends any[]>(
  action: (...args: Partial<Args>) => Action,
  handler: (...args: Args) => unknown
) {
  const wrapped = (...args: Args) => props.project.history.doAction(action(...args), () => handler(...args))
  return debounce(wrapped, 300)
}

function applyPhysicsProps(physics: Partial<Physics>) {
  const oldPhysics = props.project.stage.physics
  props.project.stage.setPhysics({ ...oldPhysics, ...physics })
}

function ensureNumberValue(n?: number | null) {
  return isFinite(n) ? toFinite(n) : 1
}

function createMapConfigureAction(locale: LocaleMessage) {
  return { name: { en: `Configure Map ${locale.en}`, zh: `修改地图 ${locale.zh}` } }
}

const handlePhysicsEnabledChange = createDebouncedActionHandler(
  (v) => createMapConfigureAction({ en: `physics ${v ? 'enable' : 'disable'}`, zh: `物理特性${v ? '启用' : '禁用'}` }),
  (v: boolean) => applyPhysicsProps({ enabled: v })
)
const handleGravityChange = createDebouncedActionHandler(
  () => createMapConfigureAction({ en: `gravity`, zh: `重力` }),
  (v: number | null) => applyPhysicsProps({ gravity: ensureNumberValue(v) })
)
const handleFrictionChange = createDebouncedActionHandler(
  () => createMapConfigureAction({ en: `friction`, zh: `摩擦力` }),
  (v: number | null) => applyPhysicsProps({ friction: ensureNumberValue(v) })
)
const handleAirDragChange = createDebouncedActionHandler(
  () => createMapConfigureAction({ en: `air drag`, zh: `空气阻力` }),
  (v: number | null) => applyPhysicsProps({ airDrag: ensureNumberValue(v) })
)
</script>

<template>
  <ConfigItemWrapper class="map-physics-config" :title="$t({ en: 'Physics', zh: '物理特性' })">
    <div class="settings">
      <UISwitch
        v-radar="{ name: 'physics input', desc: 'Input to set map physics' }"
        :value="project.stage.physics?.enabled"
        @update:value="handlePhysicsEnabledChange"
      />
      <UINumberInput
        v-radar="{ name: 'gravity input', desc: 'Input to set map gravity' }"
        :value="ensureNumberValue(project.stage.physics.gravity)"
        :disabled="disabled"
        @update:value="handleGravityChange"
      >
        <template #prefix>{{ $t({ en: 'Gravity', zh: '重力' }) }}:</template>
      </UINumberInput>
      <UINumberInput
        v-radar="{ name: 'friction input', desc: 'Input to set map friction' }"
        :value="ensureNumberValue(project.stage.physics.friction)"
        :disabled="disabled"
        @update:value="handleFrictionChange"
      >
        <template #prefix>{{ $t({ en: 'Friction', zh: '摩擦力' }) }}:</template>
      </UINumberInput>
      <UINumberInput
        v-radar="{ name: 'air drag input', desc: 'Input to set map air drag' }"
        :value="ensureNumberValue(project.stage.physics.airDrag)"
        :disabled="disabled"
        @update:value="handleAirDragChange"
      >
        <template #prefix>{{ $t({ en: 'Air Drag', zh: '空气阻力' }) }}:</template>
      </UINumberInput>
    </div>
  </ConfigItemWrapper>
</template>

<style lang="scss" scoped>
.map-physics-config {
  align-items: flex-start;
}
.settings {
  display: grid;
  justify-items: baseline;
  grid-template-columns: 0.6fr;
  gap: 8px;
}
</style>
