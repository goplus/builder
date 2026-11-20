<script setup lang="ts">
import { computed } from 'vue'
import type { SpriteContent } from '@/models/spx/common/sprite-content'
import { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import type { CostumeGen, CostumeEditComment } from '@/models/spx/gen/costume-gen'
import type { AnimationGen } from '@/models/spx/gen/animation-gen'
import { useResourceWorkspace } from '@/components/editor/sprite/resource-workspace'
import CostumeSettingsInput from '../gen/costume/CostumeSettingsInput.vue'
import AnimationSettingsInput from '../gen/animation/AnimationSettingsInput.vue'
import CostumeEditInput from './CostumeEditInput.vue'

const props = defineProps<{
  content: SpriteContent
  costume: CostumeGen | null
  animation: AnimationGen | null
  compact?: boolean
}>()
const emit = defineEmits<{ selectComment: [CostumeEditComment] }>()
const commenting = defineModel<boolean>('commenting', { default: false })
const workspace = useResourceWorkspace()
const suggestion = computed(() => {
  const { content, costume, animation } = props
  const gen = costume ?? animation
  if (gen == null || !(content instanceof SpriteEdit) || !content.isSuggestedResource(gen.id)) return null
  if (costume != null && costume.image == null && costume.generateState.status === 'initial') {
    return {
      en: 'AI suggested adding this costume. You can edit the description below.',
      zh: '这是 AI 建议添加的造型，你可以修改下方描述。'
    }
  }
  if (animation != null && animation.video == null && animation.generateVideoState.status === 'initial') {
    return {
      en: 'AI suggested adding this animation. You can edit the description below.',
      zh: '这是 AI 建议添加的动画，你可以修改下方描述。'
    }
  }
  return null
})
</script>

<template>
  <p v-if="suggestion != null" class="mb-2 text-center text-xs text-hint-2">{{ $t(suggestion) }}</p>
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
  <AnimationSettingsInput
    v-if="animation != null && (animation.result == null || workspace?.aiActive.value)"
    :gen="animation"
  />
</template>
