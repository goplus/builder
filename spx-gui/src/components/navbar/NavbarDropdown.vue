<template>
  <UIDropdown placement="bottom-start">
    <template #trigger>
      <div class="dropdown" data-name="project-dropdown">
        <slot name="trigger"></slot>
        <UIIcon class="icon-arrow" type="arrowDown" />
      </div>
    </template>
    <slot></slot>
  </UIDropdown>
</template>

<script setup lang="ts">
import { UIDropdown, UIIcon } from '@/components/ui'
</script>

<style lang="scss" scoped>
.dropdown {
  // TODO: common style with NavbarLang
  height: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;

  &:hover {
    background-color: var(--ui-color-primary-600);
  }

  :deep(.ui-icon) {
    width: 24px;
    height: 24px;
  }
  .icon-arrow {
    width: 16px;
    height: 16px;
  }
}
</style>
