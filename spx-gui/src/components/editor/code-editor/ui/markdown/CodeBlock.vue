<script setup lang="ts">
import CodeView from './CodeView.vue'

defineProps<{
  language?: string
}>()
</script>

<template>
  <section class="code-block">
    <CodeView class="code-wrapper" mode="block"><slot></slot></CodeView>
    <footer>
      <!-- TODO: actions: insert / copy -->
    </footer>
  </section>
</template>

<style lang="scss" scoped>
.code-block {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  align-self: stretch;

  border-radius: var(--ui-border-radius-2);
  border: 1px solid var(--ui-dividing-line-1);
  background: var(--ui-color-grey-100);
}
.code-wrapper {
  padding: 12px;
  min-width: 0;
  overflow-x: auto;
}
</style>
