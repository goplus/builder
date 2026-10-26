<script setup lang="ts">
import type { SpriteContent } from '@/models/spx/common/sprite-content'
import type { CostumeGen } from '@/models/spx/gen/costume-gen'
import type { AnimationGen } from '@/models/spx/gen/animation-gen'
import CostumeSettingsInput from '../gen/costume/CostumeSettingsInput.vue'
import AnimationSettingsInput from '../gen/animation/AnimationSettingsInput.vue'
import CostumeEditInput from './CostumeEditInput.vue'
import AnimationEditInput from './AnimationEditInput.vue'

defineProps<{
  content: SpriteContent
  costume: CostumeGen | null
  animation: AnimationGen | null
  compact?: boolean
}>()
const commenting = defineModel<boolean>('commenting', { default: false })
</script>

<template>
  <template v-if="costume != null">
    <CostumeEditInput
      v-if="costume.result != null"
      :key="costume.id"
      v-model:commenting="commenting"
      :class="compact ? 'min-h-28! max-h-48! gap-3!' : null"
      :gen="costume"
      :instruction="content.getCostumeInstruction(costume.id)"
      :submit="() => content.editCostume(costume!.id, content.getCostumeInstruction(costume!.id))"
      @update:instruction="content.setCostumeInstruction(costume.id, $event)"
    />
    <CostumeSettingsInput v-else :class="compact ? 'min-h-28! max-h-48! gap-3!' : null" :gen="costume" />
  </template>
  <template v-if="animation != null">
    <AnimationEditInput
      v-if="animation.video != null || animation.result != null"
      :key="animation.id"
      :class="compact ? 'min-h-28! max-h-48! gap-3!' : null"
      :gen="animation"
      :instruction="content.getAnimationInstruction(animation.id)"
      :submit="() => content.editAnimation(animation!.id, content.getAnimationInstruction(animation!.id))"
      @update:instruction="content.setAnimationInstruction(animation.id, $event)"
    />
    <AnimationSettingsInput v-else :class="compact ? 'min-h-28! max-h-48! gap-3!' : null" :gen="animation" />
  </template>
</template>
