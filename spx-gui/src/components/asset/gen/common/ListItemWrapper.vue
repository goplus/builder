<script lang="ts" setup>
import { UIBlockItem, UIIcon } from '@/components/ui'

defineEmits<{
  add: []
}>()
</script>

<template>
  <div class="flex w-full flex-col gap-3">
    <header class="text-16/6.5 font-semibold text-grey-1000">
      <slot name="title"></slot>
    </header>

    <div class="flex w-94 flex-row flex-wrap gap-2">
      <slot></slot>
      <UIBlockItem
        v-radar="{ name: 'Add', desc: 'Click to add a new item' }"
        class="justify-center text-primary-main"
        @click="$emit('add')"
      >
        <UIIcon class="w-6 h-6" type="plus" />
      </UIBlockItem>
    </div>
  </div>
</template>
