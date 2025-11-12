<script lang="ts" setup>
// import { listAllCourses } from '@/apis/course'
// import { useQuery } from '@/utils/query'
// import { ownerAll } from '@/apis/common'
// import { orderBy } from './tutorial'

import { UIImg, UITooltip } from '@/components/ui'
// import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import type { CourseSeries } from '@/apis/course-series'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithUniversalUrl } from '@/models/common/cloud'

const props = defineProps<{
  courseSeries: CourseSeries
}>()

// const courseQuery = useQuery(
//   async () => {
//     const data = await listAllCourses({
//       courseSeriesID: props.courseSeriesId,
//       owner: ownerAll
//     })
//     return orderBy(data, props.courseIDs)
//   },
//   { en: 'Failed to load course list', zh: '加载课程列表失败' }
// )

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnailUniversalUrl = props.courseSeries.thumbnail
  if (thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
})
</script>

<template>
  <RouterLink :to="`/course-series/${props.courseSeries.id}`">
    <li class="course-series-item">
      <UIImg v-if="thumbnailUrl" class="thumbnail" :src="thumbnailUrl" size="cover" />

      <UITooltip>
        <template #trigger>
          <div class="title">{{ courseSeries.title }}</div>
        </template>
        {{ courseSeries.title }}
      </UITooltip>
      <!-- <div class="header">
      </div> -->
      <!-- 
        <div class="course-series-warpper">
        <ListResultWrapper :query-ret="courseQuery" :height="214">
          <template #empty="{ style }">
            <UIEmpty size="large" img="game" :style="style">
              {{ $t({ zh: `${title}没有可用的课程`, en: `${title} has no available courses` }) }}
            </UIEmpty>
          </template>
          <template #default="{ data }">
            <ul class="course-item-list">
              <slot :data="data" />
            </ul>
          </template>
        </ListResultWrapper> 
      </div>
      -->
    </li>
  </RouterLink>
</template>

<style lang="scss" scoped>
.course-series-item {
  position: relative;
  width: 232px;
  height: 214px;
  border-radius: var(--ui-border-radius-3);
  background: var(--ui-color-grey-50);
  border: 2px solid var(--ui-color-grey-300);
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  background-image: url(@/assets/images/stage-bg.svg);

  .thumbnail {
    width: 100%;
    height: 100%;
  }

  .title {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 32px;
    line-height: 32px;
    color: #fff;
    padding: 0 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    background: rgb(from var(--ui-color-grey-1000) r g b / 0.3);
  }

  .header {
    display: flex;
    align-items: center;
    height: 52px;
    margin-bottom: 12px;

    .title {
      line-height: 28px;
      font-size: 20px;
      font-weight: 600;
      color: var(--ui-color-title);
    }
  }

  .course-series-warpper {
    &:not(:has(.course-item-list)) {
      background-color: var(--ui-color-grey-100);
      border-radius: var(--ui-border-radius-2);
    }
  }
  .course-item-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
    gap: 20px;
  }
}
</style>
