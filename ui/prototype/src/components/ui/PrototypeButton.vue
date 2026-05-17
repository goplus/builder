<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'primary' | 'secondary' | 'text'
    active?: boolean
  }>(),
  {
    type: 'secondary',
    active: false
  }
)
</script>

<template>
  <button
    class="inline-flex h-9 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors"
    :class="[
      type === 'primary' && 'bg-primary-500 text-white hover:bg-primary-600',
      type === 'secondary' && 'border border-grey-400 bg-grey-100 text-grey-900 hover:bg-grey-200',
      type === 'text' && 'bg-transparent text-primary-600 hover:bg-primary-100',
      active && 'ring-2 ring-primary-300'
    ]"
    type="button"
  >
    <slot />
  </button>
</template>
