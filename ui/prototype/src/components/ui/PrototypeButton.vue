<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'primary' | 'secondary' | 'neutral' | 'white' | 'text'
    size?: 'small' | 'medium' | 'large'
    active?: boolean
  }>(),
  {
    type: 'secondary',
    size: 'medium',
    active: false
  }
)
</script>

<template>
  <button
    class="inline-flex cursor-pointer items-center justify-center rounded-md border p-0 transition-colors focus-visible:border-primary-700 focus-visible:outline-none disabled:cursor-not-allowed"
    :class="[
      size === 'large' && 'h-10 gap-2 px-6 text-lg/[24px]',
      size === 'medium' && 'h-8 gap-1 px-4 text-base/[22px]',
      size === 'small' && 'h-[26px] gap-1 px-3 text-base/[22px]',
      type === 'primary' && 'border-transparent bg-primary-500 text-grey-100 hover:bg-primary-400 active:bg-primary-600',
      type === 'secondary' && 'border-transparent bg-primary-200 text-primary-500 hover:bg-primary-100 active:bg-primary-300',
      type === 'neutral' && 'border-grey-400 bg-grey-300 text-grey-900 hover:bg-grey-200 active:bg-grey-400',
      type === 'white' && 'border-grey-400 bg-grey-100 text-grey-900 hover:bg-grey-300 active:bg-grey-400',
      type === 'text' && 'border-transparent bg-transparent text-primary-600 hover:bg-primary-100 active:bg-primary-200',
      active && 'ring-2 ring-primary-300'
    ]"
    type="button"
  >
    <slot />
  </button>
</template>
