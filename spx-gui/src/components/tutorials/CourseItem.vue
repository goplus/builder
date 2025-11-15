<script lang="ts">
export const courseItemHeight = 214
</script>

<script lang="ts" setup>
import { type Course } from '@/apis/course'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useAsyncComputed } from '@/utils/utils'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  course: Course
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnailUniversalUrl = props.course.thumbnail
  if (thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
})
</script>

<template>
  <li
    v-radar="{ name: `Course item \u0022${props.course.title}\u0022`, desc: 'Click to start the course' }"
    class="course-item"
    :style="{ height: `${courseItemHeight}px` }"
  >
    <UIImg class="thumbnail" :src="thumbnailUrl" size="cover" />

    <div class="title">{{ course.title }}</div>
  </li>
</template>

<style lang="scss" scoped>
.course-item {
  width: 232px;
  border-radius: var(--ui-border-radius-3);
  overflow: hidden;
  transition: all 0.2s;
  position: relative;

  &:hover {
    cursor: pointer;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .thumbnail {
    width: 100%;
    height: 100%;
  }

  .title {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 40px;
    font-size: 15px;
    line-height: 40px;
    padding: 0 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    color: var(--ui-color-grey-100);
    background: rgb(from var(--ui-color-grey-1000) r g b / 0.3);
  }
}
</style>
