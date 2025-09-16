<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { type Project } from '@/models/project'
import { PhysicsMode, type Sprite } from '@/models/sprite'

import SpriteConfigItem, { wrapUpdateHandler } from './SpriteConfigItem.vue'
import { UICheckbox, UICheckboxGroup } from '@/components/ui'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

function isCollision(checkedList: string[] = checkedPhysicsModes.value) {
  return checkedList.includes(PhysicsMode.KinematicPhysic)
}
function isGravity(checkedList: string[] = checkedPhysicsModes.value) {
  return checkedList.includes(PhysicsMode.DynamicPhysic)
}
function isImmovable(checkedList: string[] = checkedPhysicsModes.value) {
  return checkedList.includes(PhysicsMode.StaticPhysic)
}

const disabledPhysicsOptions = computed(() => ({
  collision: isImmovable() || isGravity(),
  gravity: isImmovable(),
  immovable: isGravity()
}))

const checkedPhysicsModes = ref<PhysicsMode[]>([])

watch(
  () => props.sprite.physicsMode,
  (v) => (checkedPhysicsModes.value = getCheckedPhysicsModes(v)),
  { immediate: true }
)

const applyPhysicsModeToSprite = wrapUpdateHandler(
  (physicsMode: PhysicsMode) => props.sprite.setPhysicsMode(physicsMode),
  () => ({ project: props.project, sprite: props.sprite })
)

function handlePhysicsModesChange(checked: string[]) {
  let physicsMode = PhysicsMode.NoPhysic
  if (isImmovable(checked)) {
    physicsMode = PhysicsMode.StaticPhysic
  } else if (isGravity(checked)) {
    physicsMode = PhysicsMode.DynamicPhysic
  } else if (isCollision(checked)) {
    physicsMode = PhysicsMode.KinematicPhysic
  }
  applyPhysicsModeToSprite(physicsMode)
}

function getCheckedPhysicsModes(physicsMode?: PhysicsMode) {
  switch (physicsMode) {
    case PhysicsMode.KinematicPhysic:
      return [PhysicsMode.KinematicPhysic]
    case PhysicsMode.DynamicPhysic:
      return [PhysicsMode.DynamicPhysic, PhysicsMode.KinematicPhysic]
    case PhysicsMode.StaticPhysic:
      return [PhysicsMode.StaticPhysic, PhysicsMode.KinematicPhysic]
    default:
      return []
  }
}
</script>

<template>
  <SpriteConfigItem class="physics-config">
    <div class="title">{{ $t({ en: 'Physics', zh: '物理特性' }) }}:</div>
    <UICheckboxGroup class="check-group" :value="checkedPhysicsModes" @update:value="handlePhysicsModesChange">
      <UICheckbox
        v-radar="{ name: 'collsion check', desc: 'Check to set sprite physics collsion' }"
        :value="PhysicsMode.KinematicPhysic"
        :disabled="disabledPhysicsOptions.collision"
      >
        <div>{{ $t({ en: 'Collision', zh: '碰撞' }) }}</div>
      </UICheckbox>
      <UICheckbox
        v-radar="{ name: 'gravity check', desc: 'Check to set sprite physics gravity' }"
        :value="PhysicsMode.DynamicPhysic"
        :disabled="disabledPhysicsOptions.gravity"
      >
        <div>{{ $t({ en: 'Gravity', zh: '重力' }) }}</div>
      </UICheckbox>
      <UICheckbox
        v-radar="{ name: 'immovable check', desc: 'Check to set sprite physics immovable' }"
        :value="PhysicsMode.StaticPhysic"
        :disabled="disabledPhysicsOptions.immovable"
      >
        <div>{{ $t({ en: 'Immovable', zh: '固定位置' }) }}</div>
      </UICheckbox>
    </UICheckboxGroup>
  </SpriteConfigItem>
</template>

<style lang="scss">
.physics-config {
  flex-direction: column;
  align-items: baseline;

  .title {
    width: 100%;
  }

  .check-group {
    white-space: nowrap;
  }
}
</style>
