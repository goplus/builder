<script lang="ts">
export const courseSeriesItemHeight = 214
</script>

<script lang="ts" setup>
import { UIImg } from '@/components/ui'
import type { CourseSeries } from '@/apis/course-series'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithUniversalUrl } from '@/models/common/cloud'

const props = defineProps<{
  courseSeries: CourseSeries
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnailUniversalUrl = props.courseSeries.thumbnail
  if (thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
})
</script>

<template>
  <li
    v-radar="{
      name: `Course series item \u0022${props.courseSeries.title}\u0022`,
      desc: 'Click to view the course series'
    }"
    class="course-series-item"
    :style="{ height: `${courseSeriesItemHeight}px` }"
  >
    <RouterLink :to="`/course-series/${props.courseSeries.id}`">
      <UIImg class="thumbnail" :src="thumbnailUrl" size="cover" />
      <div class="title">{{ courseSeries.title }}</div>
    </RouterLink>
  </li>
</template>

<style lang="scss" scoped>
.course-series-item {
  position: relative;
  width: 232px;
  border-radius: var(--ui-border-radius-3);
  transition: all 0.2s;
  overflow: hidden;
  // TODO: Temporary background, replace with the latest assets
  background-image: url(@/assets/images/stage-bg.svg);

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
    background: rgb(from var(--ui-color-grey-1000) r g b / 0.2);
  }
}
</style>
