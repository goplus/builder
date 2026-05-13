<script setup lang="ts">
import { computed } from 'vue'

import { ownerAll } from '@/apis/common'
import { listCourseSeries } from '@/apis/course-series'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import CourseSeriesItem, { courseSeriesItemHeight } from '@/components/tutorials/CourseSeriesItem.vue'
import TutorialsBanner from '@/components/tutorials/TutorialsBanner.vue'
import { UIEmpty, UIPagination, useResponsive } from '@/components/ui'
import { useQuery } from '@/utils/query'
import { useRouteQueryParamInt } from '@/utils/route'
import { usePageTitle } from '@/utils/utils'

import '@prototype/styles/app.css'

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

<template>
  <div class="prototype-tutorial-page bg-grey-300 h-full w-full flex flex-col overflow-y-auto">
    <CommunityNavbar />

    <TutorialsBanner />

    <CenteredWrapper
      v-radar="{ name: 'Course series list', desc: 'Scroll to view the course series' }"
      class="home-content flex-1 flex flex-col items-center"
      :style="{ '--num-in-row': numInRow }"
    >
      <div class="tutorial-section-title">{{ $t({ en: 'All Tutorials', zh: '所有教程' }) }}</div>
      <ListResultWrapper :query-ret="courseSeriesQuery" :height="height">
        <template #empty>
          <UIEmpty size="extra-large">
            {{ $t({ en: 'No course series available', zh: '没有可用的课程系列' }) }}
          </UIEmpty>
        </template>
        <template #default="{ data }">
          <ul class="series-grid">
            <CourseSeriesItem v-for="courseSeries in data.data" :key="courseSeries.id" :course-series="courseSeries" />
          </ul>
        </template>
      </ListResultWrapper>

      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="mt-9 self-center" :total="pageTotal" />
    </CenteredWrapper>

    <CommunityFooter />
  </div>
</template>
