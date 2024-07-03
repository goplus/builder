<template>
  <li class="costume-item" :class="{ active: selected }">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    <div class="name-container">
      <p class="name">{{ costume.name }}</p>
    </div>
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
  flex: 0 0 auto;
  width: 140px;
  height: 140px;
  display: flex;
  flex-direction: column;
  position: relative;
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

  padding: 4px;
}

.img {
  flex: 1;
}

.name {
  font-size: 13px;
  line-height: 20px;

  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
  user-select: none;
}

.name-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 32px;
  width: 100%;
}
</style>
