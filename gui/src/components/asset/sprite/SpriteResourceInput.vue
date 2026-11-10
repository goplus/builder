<script setup lang="ts">
import type { SpriteContent } from '@/models/spx/common/sprite-content'
import type { CostumeGen, CostumeEditComment } from '@/models/spx/gen/costume-gen'
import type { AnimationGen } from '@/models/spx/gen/animation-gen'
import CostumeSettingsInput from '../gen/costume/CostumeSettingsInput.vue'
import AnimationSettingsInput from '../gen/animation/AnimationSettingsInput.vue'
import CostumeEditInput from './CostumeEditInput.vue'

defineProps<{
  content: SpriteContent
  costume: CostumeGen | null
  animation: AnimationGen | null
  compact?: boolean
}>()
const emit = defineEmits<{ selectComment: [CostumeEditComment] }>()
const commenting = defineModel<boolean>('commenting', { default: false })
</script>

<template>
  <template v-if="costume != null">
    <CostumeEditInput
      v-if="costume.result != null"
      :key="costume.id"
      v-model:commenting="commenting"
      :compact="compact"
      :gen="costume"
      :instruction="content.getCostumeInstruction(costume.id)"
      :submit="() => content.editCostume(costume!.id, content.getCostumeInstruction(costume!.id))"
      @update:instruction="content.setCostumeInstruction(costume.id, $event)"
      @select-comment="emit('selectComment', $event)"
    />
    <CostumeSettingsInput v-else :gen="costume" />
  </template>
  <AnimationSettingsInput v-if="animation != null && animation.result == null" :gen="animation" />
</template>
