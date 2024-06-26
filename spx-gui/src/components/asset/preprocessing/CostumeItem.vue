<template>
  <li class="costume-item" :class="{ active: selected }">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    <p class="name">{{ costume.name }}</p>
    <UICornerIcon v-show="selected" color="primary" type="check" />
  </li>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import { UIImg, UICornerIcon } from '@/components/ui'

const props = defineProps<{
  selected: boolean
  costume: Costume
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)
</script>

<style lang="scss" scoped>
.costume-item {
  flex: 0 0 88px;
  height: fit-content;
  display: flex;
  flex-direction: column;
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
    border-color: var(--ui-color-primary-main);
    background-color: var(--ui-color-primary-200);
  }
}

.img {
  width: 60px;
  height: 60px;
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
