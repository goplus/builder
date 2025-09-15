<!--
SpriteBasicConfig provide editing form for basic sprite properties, including
* position
* size
* rotation
* visibility
* physics
-->

<script setup lang="ts">
import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'

import SpriteConfigItem from '@/components/editor/common/config/sprite/SpriteConfigItem.vue'
import SpritePositionSize from '@/components/editor/common/config/sprite/SpritePositionSize.vue'
import SpriteDirection from '@/components/editor/common/config/sprite/SpriteDirection.vue'
import SpriteVisible from '@/components/editor/common/config/sprite/SpriteVisible.vue'
import { UICheckbox } from '@/components/ui'
import { ref } from 'vue'

defineProps<{
  sprite: Sprite
  project: Project
}>()

const collision = ref(false)
const gravity = ref(false)

function handleGravityUpdate(value: boolean) {
  gravity.value = value
  collision.value = value ? true : collision.value
}
</script>

<template>
  <div class="sprite-basic-config">
    <SpritePositionSize :sprite="sprite" :project="project" />
    <SpriteDirection :sprite="sprite" :project="project" />
    <SpriteVisible :sprite="sprite" :project="project" />
    <SpriteConfigItem>
      {{ $t({ en: 'Physics', zh: '物理特性' }) }}:
      <div class="physics-item">
        <UICheckbox v-model:checked="collision" :disabled="gravity">
          <div>{{ $t({ en: 'Collision', zh: '碰撞' }) }}</div>
        </UICheckbox>
        <UICheckbox :checked="gravity" @update:checked="handleGravityUpdate">
          <div>{{ $t({ en: 'Gravity', zh: '重力' }) }}</div>
        </UICheckbox>
      </div>
    </SpriteConfigItem>
  </div>
</template>

<style lang="scss" scoped>
.sprite-basic-config {
  display: flex;
  padding: 16px;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}

.physics-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
