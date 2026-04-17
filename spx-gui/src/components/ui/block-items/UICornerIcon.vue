<!-- icon at the top-right corner of block-item -->

<template>
  <div :class="rootClass" @click.stop="emit('click', $event)">
    <UIIcon class="h-4 w-4" :type="type" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { cn, type ClassValue } from '../utils'
import UIIcon, { type Type as IconType } from '../icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    type: IconType
    class?: ClassValue
  }>(),
  {
    class: undefined
  }
)

const emit = defineEmits<{
  click: [MouseEvent]
}>()

const rootClass = computed(() =>
  cn(
    'absolute -top-1.5 -right-1.5 h-6 w-6 flex items-center justify-center rounded-full cursor-pointer',
    'text-grey-100 bg-primary-main hover:bg-primary-400 active:bg-primary-600',
    props.class ?? null
  )
)
</script>
