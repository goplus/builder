<script setup lang="ts">
import { UIButton, UIIcon, UITooltip } from '@/components/ui'

withDefaults(
  defineProps<{
    section?: 'all' | 'history' | 'commit'
    versionLabel?: string | null
    canUndo?: boolean
    canRedo?: boolean
    canSave?: boolean
    busy?: boolean
    saving?: boolean
  }>(),
  {
    section: 'all',
    versionLabel: null,
    canUndo: false,
    canRedo: false,
    canSave: false,
    busy: false,
    saving: false
  }
)
defineEmits<{ undo: []; redo: []; discard: []; save: [] }>()
</script>

<template>
  <div
    v-if="section !== 'commit'"
    v-radar="{ name: 'Resource edit history', desc: 'Undo or redo this resource draft' }"
    role="group"
    class="flex items-center gap-2"
  >
    <UITooltip>
      {{ $t({ en: 'Previous version', zh: '上一版' }) }}
      <template #trigger
        ><UIButton
          v-radar="{ name: 'Undo edit', desc: 'Return to the previous draft' }"
          type="white"
          size="medium"
          shape="square"
          class="flex-none"
          :disabled="busy || !canUndo"
          @click="$emit('undo')"
          ><template #icon><UIIcon type="angleLeft" class="size-4" /></template></UIButton
      ></template>
    </UITooltip>
    <span class="min-w-16 text-center text-base text-text tabular-nums whitespace-nowrap" aria-live="polite">
      {{ versionLabel ?? $t({ en: 'Original', zh: '原版' }) }}
    </span>
    <UITooltip>
      {{ $t({ en: 'Next version', zh: '下一版' }) }}
      <template #trigger
        ><UIButton
          v-radar="{ name: 'Redo edit', desc: 'Restore the next draft' }"
          type="white"
          size="medium"
          shape="square"
          class="flex-none"
          :disabled="busy || !canRedo"
          @click="$emit('redo')"
          ><template #icon><UIIcon type="angleLeft" class="size-4 rotate-180" /></template></UIButton
      ></template>
    </UITooltip>
  </div>
  <div v-if="section !== 'history'" class="flex items-center gap-2">
    <UIButton
      v-radar="{ name: 'Discard changes', desc: 'Discard unapplied changes to this resource' }"
      type="white"
      size="medium"
      class="border-transparent! bg-transparent flex-none"
      :disabled="busy"
      @click="$emit('discard')"
      >{{ $t({ en: 'Discard', zh: '放弃' }) }}</UIButton
    >
    <UIButton
      v-radar="{ name: 'Save resource', desc: 'Save this resource and clear its draft history' }"
      type="primary"
      size="medium"
      :disabled="busy || !canSave"
      :loading="saving"
      @click="$emit('save')"
      >{{ $t({ en: 'Apply', zh: '采用' }) }}</UIButton
    >
  </div>
</template>
