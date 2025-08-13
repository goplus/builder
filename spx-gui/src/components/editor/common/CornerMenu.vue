<script setup lang="ts">
import { UIDropdown, UICornerIcon, UIMenu, type Color } from '@/components/ui'

defineProps<{
  color: Color
}>()
</script>

<template>
  <UIDropdown trigger="click">
    <template #trigger>
      <UICornerIcon
        v-radar="{ name: 'Options button', desc: 'Click to view more options (save to asset library, remove, etc.)' }"
        :color="color"
        type="more"
      />
    </template>
    <UIMenu>
      <slot></slot>
    </UIMenu>
  </UIDropdown>
</template>
