<script lang="ts" setup>
import type { Course } from '@/apis/course'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithWebUrl } from '@/models/common/cloud'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  course: Course
  selected: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (!props.course.thumbnail) return null
  try {
    const file = createFileWithWebUrl(props.course.thumbnail)
    return file.url(onCleanup)
  } catch {
    return null
  }
})
</script>

<template>
  <li class="course-item" :class="{ selected: props.selected }" @click="emit('click')">
    <UIImg class="thumbnail" :src="thumbnailUrl" size="cover" />

    <div class="title">{{ course.title }}</div>

    <div class="action-section">
      <slot />
    </div>
  </li>
</template>

<style lang="scss" scoped>
.course-item {
  width: 232px;
  height: 214px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  flex-shrink: 0;
  box-sizing: border-box;

  &:hover {
    border-color: var(--ui-color-grey-400);

    .action-section :deep(.corner-menu) {
      visibility: visible;
      opacity: 1;
    }
  }

  &.selected {
    outline: 2px solid var(--ui-color-primary);
    outline-offset: 2px;
  }

  .title {
    padding: 0 16px;
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 40px;
    line-height: 40px;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    background: rgb(from var(--ui-color-grey-1000) r g b / 0.3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .thumbnail {
    width: 100%;
    height: 100%;
  }

  .action-section {
    position: absolute;
    top: 8px;
    right: 8px;

    :deep(.corner-menu) {
      opacity: 0;
      visibility: hidden;
      transition: 0.1s;
    }
  }
}
</style>
