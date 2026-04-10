<template>
  <div v-bind="rootAttrs" :class="rootClass">
    <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
      <slot></slot>
    </span>
    <slot v-if="slots.suffix != null" name="suffix"></slot>
  </div>
</template>
<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import { cn, type ClassValue } from '../utils'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  size: 'medium' | 'large'
}>()

const slots = useSlots()
const attrs = useAttrs()
const rootClass = computed(() =>
  cn(
    // FIXME: `[color:var(--color-title)]` switch back to semantic `text-title` once `text-*` token merging no longer conflicts with text-size utilities.
    'w-full flex items-center gap-2 px-1.5 text-center [color:var(--color-title)]',
    props.size === 'large' ? 'h-8 text-13/5' : 'text-10/[1.6]',
    attrs.class as ClassValue | null
  )
)
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
