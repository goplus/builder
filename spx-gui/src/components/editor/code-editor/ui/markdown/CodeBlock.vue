<script setup lang="ts">
defineProps<{
  /** Only `spx` supported now. */
  language: string
}>()
</script>

<template>
  <section class="code-block">
    <!-- TODO: code highlight -->
    <pre class="code-wrapper"><code class="code"><slot></slot></code></pre>
    <footer>
      <!-- TODO: actions: insert / copy -->
    </footer>
  </section>
</template>

<style lang="scss" scoped>
.code-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: stretch;

  border-radius: var(--ui-border-radius-2);
  border: 1px solid var(--ui-dividing-line-1);
  background: var(--ui-color-grey-100);
}
.code-wrapper {
  padding: 12px;
}
</style>
