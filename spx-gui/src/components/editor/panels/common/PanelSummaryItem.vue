<!-- Summary item (sprite / sound) on panel -->

<template>
  <li class="summary-item">
    <slot></slot>
    <p class="name">{{ name }}</p>
  </li>
</template>

<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<style lang="scss" scoped>
.summary-item {
  display: flex;
  flex-direction: column;
  width: 56px;
  height: fit-content;
  align-items: center;
  border-radius: var(--ui-border-radius-1);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
}
.name {
  font-size: 10px;
  line-height: 1.5;
  padding: 0 4px 1px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-grey-800);
}
</style>
