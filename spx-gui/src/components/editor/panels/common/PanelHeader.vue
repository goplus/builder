<!-- Header for Sprite/Sound Panel -->

<template>
  <div class="panel-header" :class="{ active }" :style="styleVars">
    <div class="main">
      <slot></slot>
    </div>
    <UIDropdown trigger="click" placement="bottom-end">
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

// uiVariables.color.(sprite|sound|stage)
export type Color = {
  400: string
  500: string
  600: string
  main: string
}

const props = defineProps<{
  active: boolean
  color: Color
}>()

const styleVars = {
  '--panel-header-color-normal': props.color.main,
  '--panel-header-color-hover': props.color[400],
  '--panel-header-color-active': props.color[600]
}
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
    border-color: var(--panel-header-color-normal);
    background-color: var(--panel-header-color-normal);
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
}

.panel-header.active .add {
  &:hover {
    background-color: var(--panel-header-color-hover);
  }
  &:active {
    background-color: var(--panel-header-color-active);
  }
}
</style>
