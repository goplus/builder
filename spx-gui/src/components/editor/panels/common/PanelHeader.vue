<!-- Header for Sprite Panel -->

<!-- TODO: use UICardHeader? -->
<template>
  <div
    class="h-11 flex items-center justify-between border-b border-grey-400 pr-2.5"
    :class="active ? 'border-(--panel-color-main) bg-(--panel-color-main) text-grey-100' : 'text-title'"
  >
    <div class="h-full flex items-center px-middle text-16">
      <slot></slot>
    </div>
    <UIDropdown trigger="click" placement="bottom-end" :offset="{ x: 0, y: 16 }">
      <template #trigger>
        <div
          v-radar="{ name: 'Add', desc: 'Button to add a new item for current panel, click to view more options' }"
          class="h-7 w-7 cursor-pointer flex items-center justify-center rounded-full text-inherit transition-colors"
          :class="
            active
              ? 'hover:bg-(--panel-color-400) active:bg-(--panel-color-600)'
              : 'hover:bg-grey-400 active:bg-grey-500'
          "
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
