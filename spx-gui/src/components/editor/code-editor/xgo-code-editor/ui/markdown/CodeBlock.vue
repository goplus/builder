<script setup lang="ts">
import { useSlotText } from '@/utils/vnode'
import CodeView from '@/components/common/CodeView.vue'

defineProps<{
  language?: string
}>()

const code = useSlotText()
</script>

<template>
  <div class="py-3 pl-3">
    <CodeView class="code-view-root" :language="language" mode="block">{{ code }}</CodeView>
  </div>
</template>

<style scoped>
.code-view-root {
  padding-right: 12px;
  min-width: 0;
  overflow-x: auto;
}
</style>
