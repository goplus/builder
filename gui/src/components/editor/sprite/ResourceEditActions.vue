<script setup lang="ts">
import { UIButton, UIIcon, UITooltip } from '@/components/ui'

withDefaults(
  defineProps<{
    section?: 'all' | 'history' | 'commit'
    canUndo?: boolean
    canRedo?: boolean
    canSave?: boolean
    busy?: boolean
    saving?: boolean
  }>(),
  {
    section: 'all',
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
    class="flex items-center gap-1"
  >
    <UITooltip>
      {{ $t({ en: 'Undo', zh: '撤销' }) }}
      <template #trigger
        ><UIButton
          v-radar="{ name: 'Undo edit', desc: 'Return to the previous draft' }"
          type="white"
          size="medium"
          shape="square"
          class="border-transparent! bg-transparent flex-none"
          :disabled="busy || !canUndo"
          @click="$emit('undo')"
          ><template #icon><UIIcon type="undo" class="size-5" /></template></UIButton
      ></template>
    </UITooltip>
    <UITooltip>
      {{ $t({ en: 'Redo', zh: '重做' }) }}
      <template #trigger
        ><UIButton
          v-radar="{ name: 'Redo edit', desc: 'Restore the next draft' }"
          type="white"
          size="medium"
          shape="square"
          class="border-transparent! bg-transparent flex-none"
          :disabled="busy || !canRedo"
          @click="$emit('redo')"
          ><template #icon><UIIcon type="redo" class="size-5" /></template></UIButton
      ></template>
    </UITooltip>
  </div>
  <div v-if="section !== 'history'" class="flex items-center gap-2">
    <UIButton
      v-radar="{ name: 'Discard changes', desc: 'Discard unapplied changes to this resource' }"
      type="white"
      size="small"
      class="border-transparent! bg-transparent flex-none"
      :disabled="busy"
      @click="$emit('discard')"
      >{{ $t({ en: 'Discard', zh: '放弃' }) }}</UIButton
    >
    <UIButton
      v-radar="{ name: 'Save resource', desc: 'Save this resource and clear its draft history' }"
      type="primary"
      size="small"
      :disabled="busy || !canSave"
      :loading="saving"
      @click="$emit('save')"
      >{{ $t({ en: 'Keep', zh: '保留' }) }}</UIButton
    >
  </div>
</template>
