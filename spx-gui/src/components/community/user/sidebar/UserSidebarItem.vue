<script setup lang="ts">
import { UIIcon } from '@/components/ui'

defineProps<{
  to: string
}>()
</script>

<template>
  <RouterLink
    class="group relative flex items-center rounded-2 p-3 text-text no-underline transition-all duration-100 [&.active]:bg-primary-100 [&.active]:text-primary-main"
    exact-active-class="active"
    :to="to"
  >
    <i
      class="absolute left-3 top-3.5 h-4.25 w-4.25 rounded-full bg-grey-500 transition-all duration-100 group-[.active]:bg-primary-300"
    />
    <span
      class="relative flex-1 pl-6.5 text-13/5 [&_svg]:absolute [&_svg]:left-0 [&_svg]:top-1/2 [&_svg]:z-1 [&_svg]:-translate-y-1/2"
    >
      <slot></slot>
    </span>
    <UIIcon type="arrowAlt" class="h-3 w-3 flex-none rotate-90 text-grey-800" />
  </RouterLink>
</template>
