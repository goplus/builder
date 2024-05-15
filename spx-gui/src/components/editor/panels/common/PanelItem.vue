<!-- Item (sprite / sound) on panel -->

<template>
  <li class="panel-item" :class="{ active: props.active }">
    <slot></slot>
    <p class="name">{{ props.name }}</p>
    <div class="remove" @click.stop="emit('remove')">
      <UIIcon class="icon" type="trash" />
    </div>
    <UILoading v-if="loading" cover />
  </li>
</template>

<script setup lang="ts">
import { UIIcon, UILoading } from '@/components/ui'

const props = defineProps<{
  active: boolean
  name: string
  loading?: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()
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

    .remove {
      visibility: visible;
    }
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

.remove {
  visibility: hidden;
  position: absolute;
  top: -6px;
  right: -6px;

  display: flex;
  width: 24px;
  height: 24px;
  justify-content: center;
  align-items: center;

  color: var(--ui-color-grey-100);
  border-radius: 24px;
  background: var(--panel-color-main);
  cursor: pointer;

  &:hover {
    background-color: var(--panel-color-400);
  }
  &:active {
    background-color: var(--panel-color-600);
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}
</style>
