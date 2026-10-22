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
