<script setup lang="ts">
import { UIIcon } from '@/components/ui'

defineProps<{
  to: string
}>()
</script>

<template>
  <RouterLink class="user-sidebar-item" exact-active-class="active" :to="to">
    <i class="icon-bg" />
    <span class="content">
      <slot></slot>
    </span>
    <UIIcon class="arrow" type="arrowAlt" />
  </RouterLink>
</template>

<style lang="scss" scoped>
@import '@/utils/utils';

.user-sidebar-item {
  padding: 12px;
  position: relative;
  display: flex;
  align-items: center;

  border-radius: 12px;
  color: var(--ui-color-text);
  text-decoration: none;
  transition: 0.1s;

  .icon-bg {
    position: absolute;
    left: 12px;
    top: 14px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--ui-color-grey-500);
    transition: 0.1s;
  }

  &.active {
    color: var(--ui-color-primary-main);
    background: var(--ui-color-primary-100);

    .icon-bg {
      background: var(--ui-color-primary-300);
    }
  }
}

.content {
  position: relative;
  flex: 1 1 0;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1;

  svg {
    width: 24px;
    height: 24px;
  }
}

.arrow {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  transform: rotate(90deg);
  color: var(--ui-color-grey-800);
}
</style>
