<template>
  <div v-bind="rootAttrs" class="ui-menu-item" :class="rootClass" @click="handleClick">
    <div v-if="hasSlotIcon" class="h-6 w-6 shrink-0 *:h-full *:w-full" :class="disabled ? 'opacity-50' : null">
      <slot name="icon"></slot>
    </div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, useAttrs, useSlots } from 'vue'
import { cn, type ClassValue } from '../utils'
import { useDropdown } from '../UIDropdown'
import { ctxKey } from './UIMenu.vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    interactive?: boolean
    disabled?: boolean
  }>(),
  {
    interactive: true,
    disabled: false
  }
)

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

const slots = useSlots()
const hasSlotIcon = !!slots['icon']
const ctx = inject(ctxKey)
const dropdownCtrl = useDropdown()
const attrs = useAttrs()

const disabled = computed(() => props.disabled || !!ctx?.disabled)
const rootClass = computed(() => {
  return cn(
    'flex items-center gap-2 rounded-sm px-2 py-2 pr-10 text-grey-1000',
    disabled.value ? 'cursor-not-allowed text-grey-600' : null,
    !disabled.value && props.interactive ? 'cursor-pointer hover:bg-grey-300' : null,
    ctx?.inGroup ? 'in-group' : null,
    attrs.class as ClassValue
  )
})
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

function handleClick(e: MouseEvent) {
  if (disabled.value) return
  // It is common to put a menu in a dropdown. For most of the cases, it is ideal to hide the
  // dropdown when menu-item clicked. We may make this behavior configurable if required.
  dropdownCtrl?.setVisible(false)
  emit('click', e)
}
</script>

<style>
@layer components {
  .ui-menu-item + .ui-menu-item {
    position: relative;
    margin-top: 13px;
  }

  .ui-menu-item + .ui-menu-item::before {
    content: '';
    position: absolute;
    top: -7px;
    left: 0;
    width: 100%;
    height: 0;
    border-top: 1px solid var(--ui-color-dividing-line-2);
  }

  .ui-menu-item.in-group + .ui-menu-item.in-group {
    margin-top: 0;
  }

  .ui-menu-item.in-group + .ui-menu-item.in-group::before {
    display: none;
  }
}
</style>
