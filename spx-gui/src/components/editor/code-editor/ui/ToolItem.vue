<template>
  <UITooltip placement="bottom-start" :raw="true" :show-arrow="false">
    <!-- this is temp type force transformed, when completion hover preview merged, this will have common function and here will be removed -->
    <DocumentPreview
      v-if="inputItem.desc.type === 'doc' && !isDocEmpty"
      :header="inputItem.desc.layer.header"
      :content="inputItem.desc.layer.content"
      :more-actions="inputItem.desc.layer.moreActions"
      :recommend-action="inputItem.desc.layer.recommendAction"
    ></DocumentPreview>
    <template #trigger>
      <UITagButton class="button" @click="emit('useSnippet', inputItem.insertText)">
        <!-- eslint-disable vue/no-v-html -->
        <span class="icon" v-html="icon2SVG(inputItem.icon)"></span>
        <span class="text">{{ inputItem.label }}</span>
        <span class="sample">{{ inputItem.sample }}</span>
      </UITagButton>
    </template>
  </UITooltip>
</template>

<script setup lang="ts">
import { UITagButton, UITooltip } from '@/components/ui'
import type { InputItem } from '../EditorUI'
import DocumentPreview from './features/hover-preview/DocumentPreview.vue'
import { icon2SVG } from './common'
import { computed } from 'vue'

const props = defineProps<{
  inputItem: InputItem
}>()

const emit = defineEmits<{
  useSnippet: [insertText: string]
}>()

const isDocEmpty = computed(() => {
  if (props.inputItem.desc.type !== 'doc') return true
  const layer = props.inputItem.desc.layer
  return !layer.header?.declaration && !layer.content
})
</script>

<style scoped lang="scss">
.button {
  width: 100%;
  border: none;
  border-radius: 10px;
  box-shadow: 0 0 4px 1px rgba(0, 0, 0, 0.1);
  font-family: var(--ui-font-family-code);
}

.icon {
  margin-right: 4px;
  width: 16px;
  height: 16px;
  color: var(--ui-color-yellow-main);
}

.text {
  overflow-x: hidden;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 1em;
  color: black;
  font-weight: 500;
  font-size: 13px;
}

.sample {
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
