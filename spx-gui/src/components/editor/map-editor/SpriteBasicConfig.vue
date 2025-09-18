<script setup lang="ts">
import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'
import { UICard, UICardHeader } from '@/components/ui'

import SpritePositionSize from '@/components/editor/common/config/sprite/SpritePositionSize.vue'
import SpriteDirection from '@/components/editor/common/config/sprite/SpriteDirection.vue'
import SpriteVisible from '@/components/editor/common/config/sprite/SpriteVisible.vue'
import SpritePhysics from '@/components/editor/common/config/sprite/SpritePhysics.vue'

defineProps<{
  sprite: Sprite
  project: Project
}>()
</script>

<template>
  <UICard>
    <UICardHeader>
      {{ sprite.name }}
    </UICardHeader>
    <div class="main">
      <SpritePositionSize :sprite="sprite" :project="project" />
      <SpriteDirection :sprite="sprite" :project="project" />
      <SpriteVisible :sprite="sprite" :project="project" />
      <SpritePhysics v-if="project.stage.physics.enabled" :sprite="sprite" :project="project" />
    </div>
  </UICard>
</template>

<style lang="scss" scoped>
.main {
  display: flex;
  padding: 16px;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}
</style>
