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
  <li class="course-item">
    <UIImg class="thumbnail" :src="thumbnailUrl" size="cover" />

    <div class="title">{{ course.title }}</div>
  </li>
</template>

<style lang="scss" scoped>
.course-item {
  width: 232px;
  height: 214px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;

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
  }

  .thumbnail {
    width: 100%;
    height: 100%;
  }

  &:hover {
    cursor: pointer;
  }
}
</style>
