<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSlotText } from '@/utils/vnode'
import CodeBlock from './CodeBlock.vue'

const props = defineProps<{
  /**
   * 文件内容
   */
  content?: string
  
  /**
   * 文件路径 - 可选，如果提供，会从中提取文件名
   */
  file?: string
}>()

const slotCode = useSlotText()
const getContent = computed(() => props.content || slotCode.value)

// 根据文件路径或名称确定显示的文件名
const displayFilename = computed(() => {
  if (props.file) {
    return props.file;
  }
  
  return null;
});

// 根据文件名确定语言
const determinedLanguage = "spx"

const initialCollapsed = ref(true)
</script>

<template>
  <div class="file-content">
    <div v-if="displayFilename" class="filename">{{ displayFilename }}</div>
    <CodeBlock :language="determinedLanguage" :code="getContent" :collapsed="initialCollapsed" />
  </div>
</template>

<style lang="scss" scoped>
.file-content {
  margin: 1rem 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--ui-color-grey-300);
  
  .filename {
    padding: 0.5rem 1rem;
    background-color: var(--ui-color-grey-200);
    font-size: 0.9rem;
    font-family: var(--ui-font-family-code);
    color: var(--ui-color-grey-800);
    border-bottom: 1px solid var(--ui-color-grey-300);
  }
}
</style>