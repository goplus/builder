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
    'ui-corner-icon absolute -top-1.5 -right-1.5 h-6 w-6 flex items-center justify-center rounded-full cursor-pointer',
    'text-grey-100 bg-primary-main hover:bg-primary-400 active:bg-primary-600',
    props.class
  )
)
</script>

<style scoped>
.ui-corner-icon {
  box-sizing: border-box;
  padding: var(--editor-card-corner-inset, 0);
  background-clip: content-box;
}

.ui-corner-icon :deep(.ui-icon) {
  width: var(--editor-card-corner-icon-size, 16px);
  height: var(--editor-card-corner-icon-size, 16px);
}
</style>
