<script lang="ts" setup>
import type { Course } from '@/apis/course'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  course: Course
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (props.course.thumbnail == null) return null
  const file = await createFileWithUniversalUrl(props.course.thumbnail)
  return file.url(onCleanup)
})
</script>

<template>
  <li class="course-item">
    <UIImg class="thumbnail" :src="thumbnailUrl" size="cover" />
    <div class="title" :title="course.title">{{ course.title }}</div>
    <div class="action-section">
      <slot />
    </div>
  </li>
</template>

<style lang="scss" scoped>
.course-item {
  width: 232px;
  height: 214px;
  border-radius: var(--ui-border-radius-3);
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: 0.2s;
  border: 2px solid var(--ui-color-grey-300);
  flex-shrink: 0;
  box-sizing: border-box;

  &:hover {
    border-color: var(--ui-color-grey-400);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

    .action-section :deep(.corner-menu) {
      visibility: visible;
      opacity: 1;
    }
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
    color: var(--ui-color-grey-100);
    background: rgb(from var(--ui-color-grey-1000) r g b / 0.3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
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
