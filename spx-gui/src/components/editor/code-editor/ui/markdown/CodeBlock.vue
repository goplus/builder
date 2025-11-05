<script setup lang="ts">
import { useSlotTextLegacy } from '@/utils/vnode'
import CodeView from '@/components/common/CodeView.vue'

defineProps<{
  language?: string
}>()

const code = useSlotTextLegacy()
</script>

<template>
  <div class="code-block">
    <CodeView class="code" :language="language" mode="block">{{ code }}</CodeView>
  </div>
</template>

<style lang="scss" scoped>
.code-block {
  padding: 12px 0 12px 12px;
}
.code {
  padding-right: 12px;
  min-width: 0;
  overflow-x: auto;
}
</style>
