<!-- Header for Sprite Panel -->

<template>
  <!-- TODO: use UICardHeader? -->
  <div
    class="flex h-11 items-center justify-between border-b border-grey-400 pr-2.5 text-title"
  >
    <div class="flex h-full items-center px-middle text-16">
      <slot></slot>
    </div>
    <UIDropdown trigger="click" placement="bottom-end" :offset="{ x: 0, y: 16 }">
      <template #trigger>
        <div
          v-radar="{ name: 'Add', desc: 'Button to add a new item for current panel, click to view more options' }"
          class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-grey-700 transition-colors hover:text-grey-900 active:text-grey-1000"
        >
          <UIIcon type="plus" />
        </div>
      </template>
      <slot name="add-options"></slot>
    </UIDropdown>
  </div>
</template>

<script setup lang="ts">
import { UIDropdown, UIIcon } from '@/components/ui'

defineProps<{
  active: boolean
}>()
</script>
