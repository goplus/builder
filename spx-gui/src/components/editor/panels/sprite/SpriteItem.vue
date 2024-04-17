<template>
  <li class="sprite-item" :class="{ active: props.active }">
    <div class="img" :style="imgStyle"></div>
    <p class="name">{{ props.sprite.name }}</p>
    <div class="remove" @click.stop="emit('remove')">
      <UIIcon class="icon" type="trash" />
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIIcon } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'

const props = defineProps<{
  sprite: Sprite
  active: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()

const imgSrc = useFileUrl(() => props.sprite.costume?.img)
const imgStyle = computed(() => imgSrc.value && { backgroundImage: `url("${imgSrc.value}")` })
</script>

<style lang="scss" scoped>
.sprite-item {
  display: flex;
  flex-direction: column;
  width: 80px;
  height: fit-content;
  position: relative;
  align-items: center;
  border-radius: var(--ui-border-radius-1);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &.active {
    border-color: var(--ui-color-sprite-main);
    background-color: var(--ui-color-sprite-200);

    .remove {
      visibility: visible;
    }
  }
}

.img {
  width: 60px;
  height: 60px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.name {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.6;
  font-weight: 400;
  padding: 3px 8px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
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
  background: var(--ui-color-sprite-main);
  cursor: pointer;

  .icon {
    width: 16px;
    height: 16px;
  }
}
</style>
