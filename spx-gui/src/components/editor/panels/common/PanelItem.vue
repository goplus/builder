<!-- Item (sprite / sound) on panel -->

<template>
  <li class="panel-item" :class="{ active: active }">
    <slot></slot>
    <p class="name">{{ name }}</p>
    <UIDropdown trigger="click" placement="bottom-end">
      <template #trigger>
        <UICornerIcon v-show="active" :color="panelColor" type="more" />
      </template>
      <UIMenu>
        <UIMenuItem @click="emit('addToAssetLibrary')">{{
          $t({ en: 'Add to asset library', zh: '添加到素材库' })
        }}</UIMenuItem>
        <UIMenuItem @click="emit('remove')">{{ $t({ en: 'Remove', zh: '删除' }) }}</UIMenuItem>
      </UIMenu>
    </UIDropdown>
  </li>
</template>

<script setup lang="ts">
import { UICornerIcon, UIDropdown, UIMenu, UIMenuItem } from '@/components/ui'
import { usePanelColor } from './CommonPanel.vue'

defineProps<{
  active: boolean
  name: string
}>()

const emit = defineEmits<{
  remove: []
  addToAssetLibrary: []
}>()

const panelColor = usePanelColor()
</script>

<style lang="scss" scoped>
.panel-item {
  display: flex;
  flex-direction: column;
  width: 88px;
  height: fit-content;
  position: relative;
  align-items: center;
  border-radius: var(--ui-border-radius-1);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &:not(.active):hover {
    border-color: var(--ui-color-grey-400);
    background-color: var(--ui-color-grey-400);
  }

  &.active {
    border-color: var(--panel-color-main);
    background-color: var(--panel-color-200);
  }
}

.name {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.6;
  padding: 4px 8px 2px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}
</style>
