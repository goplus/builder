<script lang="ts" setup>
import { listCourse, type Course } from '@/apis/course'
import { useQuery } from '@/utils/query'
import { ownerAll } from '@/apis/common'

import { UIEmpty } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'

const props = defineProps<{
  courseSeriesId: string
  courseIDs?: string[]
  title: string
}>()

function orderBy(courses: Course[], courseIDs?: string[]) {
  if (!courseIDs) return courses
  return courses.sort((a, b) => courseIDs.indexOf(a.id) - courseIDs.indexOf(b.id))
}

const courseQuery = useQuery(
  async () => {
    const { data } = await listCourse({ courseSeriesID: props.courseSeriesId, owner: ownerAll })
    return orderBy(data, props.courseIDs)
  },
  { en: 'Failed to load course list', zh: '加载课程列表失败' }
)
</script>

<template>
  <section class="course-series-item">
    <header class="header">
      <h2 class="title">
        {{ title }}
      </h2>
    </header>

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
  </section>
</template>

<style lang="scss" scoped>
.course-series-item {
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
