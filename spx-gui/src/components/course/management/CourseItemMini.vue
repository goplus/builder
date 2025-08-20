<script lang="ts" setup>
import type { Course } from '@/apis/course'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithWebUrl } from '@/models/common/cloud'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  course: Course
  interactive?: boolean
  highlighted?: boolean
  dimmed?: boolean
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (props.course.thumbnail == null) return null
  const file = createFileWithWebUrl(props.course.thumbnail)
  return file.url(onCleanup)
})
</script>

<template>
  <div
    class="course-item-mini"
    :class="{
      interactive,
      highlighted,
      dimmed
    }"
  >
    <slot name="prefix" />
    <UIImg class="thumbnail" :src="thumbnailUrl" size="cover" />
    <div class="info">
      <div class="title">{{ course.title }}</div>
    </div>
    <slot name="suffix" />
  </div>
</template>

<style lang="scss" scoped>
.course-item-mini {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: var(--ui-border-radius-1);
  background: var(--ui-color-grey-50);
  border: 2px solid transparent;
  transition: all 0.2s;

  &.interactive {
    cursor: pointer;

    &:hover {
      background: var(--ui-color-primary-100);
    }
  }

  &.highlighted {
    border-color: var(--ui-color-grey-400);
    background: var(--ui-color-grey-100);
  }

  &.dimmed {
    opacity: 0.5;
  }
}

.thumbnail {
  width: 48px;
  height: 36px;
  border-radius: var(--ui-border-radius-1);
  flex-shrink: 0;
}

.info {
  flex: 1;
  margin: 0 12px;
  overflow: hidden;
}

.title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ui-color-grey-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
