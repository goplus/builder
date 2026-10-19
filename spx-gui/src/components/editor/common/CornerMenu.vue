<script setup lang="ts">
import { UIDropdown, UICornerIcon, UIMenu } from '@/components/ui'
</script>

<template>
  <UIDropdown trigger="click">
    <template #trigger>
      <UICornerIcon
        v-radar="{ name: 'Options button', desc: 'Click to view more options (save to asset library, remove, etc.)' }"
        class="corner-menu"
        type="more"
      />
    </template>
    <UIMenu>
      <slot></slot>
    </UIMenu>
  </UIDropdown>
</template>

<style scoped>
.corner-menu {
  box-sizing: border-box;
  padding: var(--editor-card-corner-inset, 0);
  background-clip: content-box;
}

.corner-menu :deep(.ui-icon) {
  width: var(--editor-card-corner-icon-size, 16px);
  height: var(--editor-card-corner-icon-size, 16px);
}
</style>
