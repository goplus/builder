<script setup lang="ts">
import logoSimpleSvg from './logo-simple.svg?raw'
</script>

<template>
  <div class="copilot-trigger">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="icon" v-html="logoSimpleSvg"></div>
    {{
      $t({
        en: 'Ask copilot',
        zh: '向 Copilot 提问'
      })
    }}
  </div>
</template>

<style lang="scss" scoped>
.copilot-trigger {
  flex: 1 1 0;
  padding: 7px 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: var(--ui-border-radius-1);
  border: 1px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background-color: var(--ui-color-grey-200);
  }
}

.icon {
  width: 24px;
  height: 24px;
}
</style>
