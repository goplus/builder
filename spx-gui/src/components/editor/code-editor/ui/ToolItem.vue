<template>
  <UITooltip placement="bottom-start" :raw="true" :no-arrow="true">
    <!-- this is temp type force transformed, when completion hover preview merged, this will have common function and here will be removed -->
    <DocumentPreview :content="(inputItem.desc as DocPreview).content"></DocumentPreview>
    <template #trigger>
      <UITagButton @click="emit('useSnippet', inputItem.insertText)">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span :ref="el => normalizeIconSize(el as Element, 16)" v-html="icon2SVG(inputItem.icon)"></span>
        <span class="text">{{ inputItem.label }}</span>
        <span>{{ inputItem.sample }}</span>
      </UITagButton>
    </template>
  </UITooltip>
</template>

<script setup lang="ts">
import { UITagButton, UITooltip } from '@/components/ui'
import type { InputItem } from '../EditorUI'
import DocumentPreview from './features/hover-preview/DocumentPreview.vue'
import { icon2SVG, normalizeIconSize } from './common'
import type { DocPreview } from '../EditorUI'

defineProps<{
  inputItem: InputItem
}>()

const emit = defineEmits<{
  useSnippet: [insertText: string]
}>()

</script>

<style scoped lang="scss">
.text {
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
}
</style>
