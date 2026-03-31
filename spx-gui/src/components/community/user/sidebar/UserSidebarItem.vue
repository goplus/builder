<script setup lang="ts">
import { UIIcon } from '@/components/ui'

defineProps<{
  to: string
}>()
</script>

<template>
  <RouterLink
    class="user-sidebar-item relative flex items-center rounded-2 p-3 no-underline transition-all duration-100"
    exact-active-class="active"
    :to="to"
  >
    <i class="icon-bg absolute left-3 top-3.5 h-4.25 w-4.25 rounded-full transition-all duration-100" />
    <span
      class="relative flex-1 pl-6.5 text-[13px] leading-5 [&_svg]:absolute [&_svg]:left-0 [&_svg]:top-1/2 [&_svg]:z-1 [&_svg]:-translate-y-1/2"
    >
      <slot></slot>
    </span>
    <UIIcon class="h-3 w-3 flex-none rotate-90 text-grey-800" type="arrowAlt" />
  </RouterLink>
</template>

<style scoped>
.user-sidebar-item {
  color: var(--ui-color-text);
}

.icon-bg {
  background: var(--ui-color-grey-500);
}

.user-sidebar-item.active {
  color: var(--ui-color-primary-main);
  background: var(--ui-color-primary-100);
}

.user-sidebar-item.active .icon-bg {
  background: var(--ui-color-primary-300);
}
</style>
