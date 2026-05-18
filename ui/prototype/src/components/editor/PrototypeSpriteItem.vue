<script setup lang="ts">
defineProps<{
  sprite: {
    name: string
    shortName: string
    image: string
    hidden: boolean
  }
  active?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button class="prototype-sprite-item" :class="{ active }" type="button" @click="emit('select')">
    <span v-if="$slots.corner" class="prototype-sprite-item-corner" @click.stop>
      <slot name="corner"></slot>
    </span>
    <img :src="sprite.image" :alt="sprite.name" />
    <span class="prototype-sprite-item-title">
      <span class="prototype-sprite-item-name">{{ sprite.shortName }}</span>
      <span v-if="sprite.hidden" class="prototype-sprite-item-hidden">⌁</span>
    </span>
  </button>
</template>

<style scoped>
.prototype-sprite-item {
  position: relative;
  box-sizing: border-box;
  width: 88px;
  height: 88px;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2px;
  color: var(--ui-color-grey-1000);
  cursor: pointer;
}

.prototype-sprite-item::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: inherit;
  pointer-events: none;
}

.prototype-sprite-item.active {
  background: var(--ui-color-primary-200);
}

.prototype-sprite-item.active::before {
  border-width: 2px;
  border-color: var(--ui-color-primary-main);
}

.prototype-sprite-item img {
  width: 60px;
  height: 60px;
  margin-bottom: 5px;
  object-fit: contain;
}

.prototype-sprite-item-title {
  display: flex;
  width: 100%;
  height: 22px;
  align-items: center;
  gap: 8px;
  padding: 0 6px;
  color: var(--ui-color-grey-1000);
  font-size: 11px;
  line-height: 22px;
  text-align: center;
}

.prototype-sprite-item-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prototype-sprite-item-hidden {
  flex: 0 0 auto;
  color: var(--ui-color-grey-500);
}

.prototype-sprite-item-corner {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 5;
}
</style>
