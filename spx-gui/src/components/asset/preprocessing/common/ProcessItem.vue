<template>
  <li class="process-item" :class="{ active, applied }">
    <UIImg class="img" :src="imgSrc" />
    <div class="applied-icon">
      <UIIcon color="sprite" type="check" />
    </div>
    <p class="name">{{ name }}</p>
  </li>
</template>

<script setup lang="ts">
import { UIImg, UIIcon } from '@/components/ui'

defineProps<{
  imgSrc: string
  name: string
  /** If the processing is already applied (to image) */
  applied: boolean
  active: boolean
}>()
</script>

<style lang="scss" scoped>
.process-item {
  display: flex;
  flex-direction: column;
  width: 88px;
  height: fit-content;
  position: relative;
  align-items: center;
  cursor: pointer;

  &.active .img {
    box-shadow: inset 0 0 0 2px var(--ui-color-primary-main);
  }

  &.applied .applied-icon {
    opacity: 1;
  }
}

.img {
  border-radius: var(--ui-border-radius-1);
  width: 88px;
  height: 66px;
}

.applied-icon {
  position: absolute;
  top: 21px;
  left: 32px;
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;

  transition: 0.2s;
  opacity: 0;
  color: var(--ui-color-grey-100);
  border-radius: 50%;
  background-color: var(--ui-color-green-main);
}

.name {
  width: 100%;
  padding: 2px 1em;
  font-size: 10px;
  line-height: 1.4;

  text-align: center;
  color: var(--ui-color-title);
}
</style>
