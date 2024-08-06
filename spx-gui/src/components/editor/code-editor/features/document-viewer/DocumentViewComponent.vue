<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import type { DocDetail, DocumentViewer } from './DocumentViewer'
import DocumentDetail from '@/components/editor/code-editor/DocumentDetail.vue'
import { UIButton } from '@/components/ui'

const props = defineProps<{
  documentViewer: DocumentViewer
}>()

const markdown = ref<DocDetail>('')
const documentVisible = ref(false)

props.documentViewer.onShowDocDetail((content) => {
  documentVisible.value = true
  markdown.value = content
})

onUnmounted(() => {
  props.documentViewer.dispose()
})
</script>

<template>
  <div v-show="documentVisible" class="document-view">
    <nav>
      <UIButton @click="documentVisible = false">关闭预览</UIButton>
    </nav>
    <document-detail :markdown="markdown"></document-detail>
  </div>
</template>

<style lang="scss">
.document-view {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 4px;
  background-color: white;
}
</style>
