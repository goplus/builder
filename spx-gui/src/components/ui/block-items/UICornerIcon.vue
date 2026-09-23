<!-- icon at the top-right corner of block-item -->

<template>
  <component
    :is="button ? 'button' : 'div'"
    :type="button ? 'button' : undefined"
    :class="rootClass"
    @click.stop="emit('click', $event)"
  >
    <UIIcon class="h-4 w-4" :type="type" />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { cn, type ClassValue } from '../utils'
import UIIcon, { type Type as IconType } from '../icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    type: IconType
    button?: boolean
    class?: ClassValue
  }>(),
  {
    class: undefined,
    button: false
  }
)

const emit = defineEmits<{
  click: [MouseEvent]
}>()

const rootClass = computed(() =>
  cn(
    'absolute -top-1.5 -right-1.5 h-6 w-6 flex items-center justify-center rounded-full cursor-pointer',
    'text-grey-100 bg-primary-main hover:bg-primary-400 active:bg-primary-600',
    props.button && 'border-0 p-0',
    props.class
  )
)
</script>
