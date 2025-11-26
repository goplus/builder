<template>
  <div class="tutorials-wrapper">
    <!-- TODO: Temporarily import the community component -->
    <CommunityNavbar />

    <TutorialsBanner />

    <CenteredWrapper
      v-radar="{ name: 'Course series list', desc: 'Scroll to view the course series' }"
      class="centered-wrapper"
      :style="{ '--num-in-row': numInRow }"
    >
      <ListResultWrapper :query-ret="courseSeriesQuery" :height="height">
        <template #empty>
          <UIEmpty size="extra-large">
            {{ $t({ en: 'No course series available', zh: '没有可用的课程系列' }) }}
          </UIEmpty>
        </template>
        <template #default="{ data }">
          <ul class="course-series-list">
            <CourseSeriesItem v-for="courseSeries in data.data" :key="courseSeries.id" :course-series="courseSeries" />
          </ul>
        </template>
      </ListResultWrapper>

      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
    </CenteredWrapper>

    <CommunityFooter />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'

import { listCourseSeries } from '@/apis/course-series'

import { UIEmpty, UIPagination, useResponsive } from '@/components/ui'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CourseSeriesItem, { courseSeriesItemHeight } from '@/components/tutorials/CourseSeriesItem.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import TutorialsBanner from '@/components/tutorials/TutorialsBanner.vue'
import { ownerAll } from '@/apis/common'
import { useRouteQueryParamInt } from '@/utils/route'

usePageTitle({
  en: 'Tutorials',
  zh: '教程'
})

const numInColumn = 4
const courseSeriesPadding = 16
const height = numInColumn * (courseSeriesItemHeight + courseSeriesPadding) - courseSeriesPadding

const page = useRouteQueryParamInt('p', 1)
const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))
const pageSize = computed(() => numInRow.value * numInColumn)
const pageTotal = computed(() => Math.ceil((courseSeriesQuery.data.value?.total ?? 0) / pageSize.value))

const courseSeriesQuery = useQuery(
  (ctx) =>
    listCourseSeries(
      {
        owner: ownerAll,
        pageIndex: page.value,
        pageSize: pageSize.value,
        orderBy: 'order',
        sortOrder: 'asc'
      },
      ctx.signal
    ),
  {
    en: 'Failed to load course series',
    zh: '加载课程系列失败'
  }
)
</script>

<style lang="scss" scoped>
.tutorials-wrapper {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  width: 100%;
  height: 100%;
  background-color: var(--ui-color-grey-300);

  .centered-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 32px auto;
    flex: 1;

    .course-series-list {
      display: grid;
      grid-template-columns: repeat(var(--num-in-row), 1fr);
      gap: var(--ui-gap-middle);
    }

    .pagination {
      align-self: center;
      margin-top: 36px;
    }
  }
}
</style>
