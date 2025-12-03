<script lang="ts">
enum PhysicsFlag {
  Collision = 'Collision',
  Gravity = 'Gravity',
  Immovable = 'Immovable'
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { type Project } from '@/models/project'
import { PhysicsMode, type Sprite } from '@/models/sprite'
import { wrapUpdateHandler } from '../utils'

import { UICheckbox, UICheckboxGroup, UITooltip } from '@/components/ui'
import { isEmpty, xor } from 'lodash'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

function isGravity(checkedList: string[] = checkedPhysicsFlags.value) {
  return checkedList.includes(PhysicsFlag.Gravity)
}
function isImmovable(checkedList: string[] = checkedPhysicsFlags.value) {
  return checkedList.includes(PhysicsFlag.Immovable)
}

const disabledPhysicsOptions = computed(() => ({
  collision: isImmovable() || isGravity(),
  gravity: isImmovable(),
  immovable: isGravity()
}))

const checkedPhysicsFlags = ref<PhysicsFlag[]>([])

const physicsModeFlagsMap = new Map<PhysicsMode, PhysicsFlag[]>([
  [PhysicsMode.NoPhysics, []],
  [PhysicsMode.KinematicPhysics, [PhysicsFlag.Collision]],
  [PhysicsMode.DynamicPhysics, [PhysicsFlag.Gravity, PhysicsFlag.Collision]],
  [PhysicsMode.StaticPhysics, [PhysicsFlag.Immovable, PhysicsFlag.Collision]]
])

watch(
  () => props.sprite.physicsMode,
  (v) => (checkedPhysicsFlags.value = getCheckedPhysicsFlags(v)),
  { immediate: true }
)

const applyPhysicsModeToSprite = wrapUpdateHandler(
  (physicsMode: PhysicsMode) => props.sprite.setPhysicsMode(physicsMode),
  () => ({ project: props.project, sprite: props.sprite }),
  false
)

function handlePhysicsFlagsChange(checked: string[]) {
  const checkedSet = new Set()
  if (checked.includes(PhysicsFlag.Collision)) {
    checkedSet.add(PhysicsFlag.Collision)
  }
  if (checked.includes(PhysicsFlag.Gravity)) {
    checkedSet.add(PhysicsFlag.Collision)
    checkedSet.add(PhysicsFlag.Gravity)
  }
  if (checked.includes(PhysicsFlag.Immovable)) {
    checkedSet.add(PhysicsFlag.Collision)
    checkedSet.add(PhysicsFlag.Immovable)
    checkedSet.delete(PhysicsFlag.Gravity)
  }

  let physicsMode = PhysicsMode.NoPhysics
  const checkedList = Array.from(checkedSet)
  physicsModeFlagsMap.forEach((flags, mode) => {
    if (isEmpty(xor(flags, checkedList))) {
      physicsMode = mode
    }
  })

  applyPhysicsModeToSprite(physicsMode)
}

function getCheckedPhysicsFlags(physicsMode: PhysicsMode): PhysicsFlag[] {
  return physicsModeFlagsMap.get(physicsMode) ?? []
}
</script>

<template>
  <UICheckboxGroup class="check-group" :value="checkedPhysicsFlags" @update:value="handlePhysicsFlagsChange">
    <UITooltip>
      <template #trigger>
        <UICheckbox
          v-radar="{ name: 'collision check', desc: 'Check to set sprite physics collision' }"
          :value="PhysicsFlag.Collision"
          :disabled="disabledPhysicsOptions.collision"
        >
          <div>{{ $t({ en: 'Collision', zh: '碰撞' }) }}</div>
        </UICheckbox>
      </template>
      {{
        $t({
          en: 'The sprite can collide with other sprites or map obstacles',
          zh: '精灵可以与其他精灵或地图障碍物发生碰撞'
        })
      }}
    </UITooltip>
    <UITooltip>
      <template #trigger>
        <UICheckbox
          v-radar="{ name: 'gravity check', desc: 'Check to set sprite physics gravity' }"
          :value="PhysicsFlag.Gravity"
          :disabled="disabledPhysicsOptions.gravity"
        >
          <div>{{ $t({ en: 'Gravity', zh: '重力' }) }}</div>
        </UICheckbox>
      </template>
      {{ $t({ en: 'The sprite is affected by gravity', zh: '精灵会受到重力影响' }) }}
    </UITooltip>
    <UITooltip>
      <template #trigger>
        <UICheckbox
          v-radar="{ name: 'immovable check', desc: 'Check to set sprite physics immovable' }"
          :value="PhysicsFlag.Immovable"
          :disabled="disabledPhysicsOptions.immovable"
        >
          <div>{{ $t({ en: 'Immovable', zh: '固定位置' }) }}</div>
        </UICheckbox>
      </template>
      {{
        $t({
          zh: '精灵会发生碰撞，但是位置固定，如墙壁、障碍物等',
          en: 'The sprite can collide with other sprites, but its position is fixed, e.g., walls, obstacles'
        })
      }}
    </UITooltip>
  </UICheckboxGroup>
</template>

<style lang="scss" scoped>
.check-group {
  white-space: nowrap;
}
</style>
