<!-- Header for Sprite Panel -->

<template>
  <UICardHeader class="h-11 justify-between">
    <slot></slot>
    <UIDropdown trigger="click" placement="bottom-end" :offset="{ x: 0, y: 16 }">
      <template #trigger>
        <div
          v-radar="{ name: 'Add', desc: 'Button to add a new item for current panel, click to view more options' }"
          class="h-7 w-7 cursor-pointer flex items-center justify-center rounded-full text-grey-800 transition-colors hover:text-grey-900 active:text-grey-1000"
        >
          <UIIcon type="plus" />
        </div>
      </template>
      <slot name="add-options"></slot>
    </UIDropdown>
  </UICardHeader>
</template>

<script setup lang="ts">
import { UICardHeader, UIDropdown, UIIcon } from '@/components/ui'

defineProps<{
  active: boolean
}>()
</script>
