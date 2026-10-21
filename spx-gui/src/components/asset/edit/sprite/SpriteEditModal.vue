<script setup lang="ts">
import type { SpriteContentSelected } from '@/models/spx/common/sprite-content'
import type { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import { UIModal, UIModalClose, UITooltip } from '@/components/ui'
import SpriteContentEditor from '../../sprite/SpriteContentEditor.vue'

defineProps<{
  visible: boolean
  edit: SpriteEdit
  apply: (item: SpriteContentSelected) => Promise<void>
}>()

const emit = defineEmits<{
  resolved: []
  cancelled: []
}>()
</script>

<template>
  <UIModal
    :radar="{ name: 'Sprite editing modal', desc: 'Edit sprite costumes and animations' }"
    style="width: 1076px; max-width: calc(100vw - 32px); height: 800px; max-height: calc(100dvh - 32px)"
    :visible="visible"
    mask-closable
    @update:visible="emit('cancelled')"
  >
    <header class="min-h-14 shrink-0 flex items-center justify-between gap-4 border-b border-grey-400 px-6">
      <h2 class="text-xl text-title">{{ $t({ zh: '编辑精灵', en: 'Edit Sprite' }) }}</h2>
      <UITooltip>
        {{ $t({ en: 'Minimize and keep your changes', zh: '收起，保留未采用的修改' }) }}
        <template #trigger><UIModalClose @click="emit('cancelled')" /></template>
      </UITooltip>
    </header>
    <SpriteContentEditor
      class="flex-[1_1_0] min-h-0"
      :content="edit"
      :apply-resource="apply"
      @collapse="emit('cancelled')"
    />
  </UIModal>
</template>
