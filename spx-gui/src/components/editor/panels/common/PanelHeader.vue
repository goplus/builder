<!-- Header for Sprite/Sound Panel -->

<template>
  <!-- TODO: use UICardHeader? -->
  <div class="panel-header" :class="{ active }">
    <div class="main">
      <slot></slot>
    </div>
    <UIDropdown trigger="click" placement="bottom-end" :offset="{ x: 0, y: 16 }">
      <template #trigger>
        <div class="add">
          <UIIcon type="plus" />
        </div>
      </template>
      <slot name="add-options"></slot>
    </UIDropdown>
  </div>
</template>

<script setup lang="ts">
import { UIDropdown, UIIcon } from '@/components/ui'

defineProps<{
  active: boolean
}>()
</script>

<style scoped lang="scss">
.panel-header {
  height: 44px;
  display: flex;
  padding-right: 10px;
  justify-content: space-between;
  align-items: center;
  color: var(--ui-color-title);
  border-bottom: 1px solid var(--ui-color-grey-400);

  &.active {
    color: var(--ui-color-grey-100);
    border-color: var(--panel-color-main);
    background-color: var(--panel-color-main);
  }
}

.main {
  height: 100%;
  padding: 0 var(--ui-gap-middle);
  display: flex;
  align-items: center;
  font-size: 16px;
}

.add {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  border-radius: 14px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--ui-color-grey-400);
  }
  &:active {
    background-color: var(--ui-color-grey-500);
  }
}

.panel-header.active .add {
  &:hover {
    background-color: var(--panel-color-400);
  }
  &:active {
    background-color: var(--panel-color-600);
  }
}
</style>
