<script setup lang="ts">
import { cn, type ClassValue } from '../utils'

const props = withDefaults(
  defineProps<{
    time: string
    class?: ClassValue
  }>(),
  {
    class: undefined
  }
)
</script>

<template>
  <div :class="cn('group/timeline-item relative', props.class)">
    <div class="absolute top-[5px] left-1 h-full" aria-hidden="true">
      <div class="h-2 w-2 rounded-full bg-grey-500"></div>
      <div
        class="absolute top-2 bottom-0 left-[50%] w-px -translate-x-[50%] bg-grey-500 group-last/timeline-item:hidden"
      ></div>
    </div>
    <div class="ml-[31px] mb-lg">
      <div class="text-xs text-hint-2">{{ props.time }}</div>
      <div class="text-base">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
