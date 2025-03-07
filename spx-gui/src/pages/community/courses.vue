<template>
  <CenteredWrapper class="main">
    <CoursesSection :query-ret="easyCourses" :num-in-row="numInRow" icon-color="green">
      <template #title>
        {{
          $t({
            en: 'Easy',
            zh: '入门课程'
          })
        }}
      </template>
      <CourseItem v-for="course in easyCourses.data.value" :key="course.id" :course="course" />
    </CoursesSection>
    <CoursesSection :query-ret="mediumCourses" :num-in-row="numInRow" icon-color="blue">
      <template #title>
        {{
          $t({
            en: 'Medium',
            zh: '中级课程'
          })
        }}
      </template>
      <CourseItem v-for="course in mediumCourses.data.value" :key="course.id" :course="course" />
    </CoursesSection>
    <CoursesSection :query-ret="hardCourses" :num-in-row="numInRow" icon-color="red">
      <template #title>
        {{
          $t({
            en: 'Hard',
            zh: '高级课程'
          })
        }}
      </template>
      <CourseItem v-for="course in hardCourses.data.value" :key="course.id" :course="course" />
    </CoursesSection>
  </CenteredWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CoursesSection from '@/components/guidance/CoursesSection.vue'
import CourseItem from '@/components/guidance/CourseItem.vue'
import { useQuery } from '@/utils/query'
import { listStoryLine } from '@/apis/storyline'
import { useResponsive } from '@/components/ui'

const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))

const easyCourses = useQuery(
  async () => {
    return listStoryLine('easy')
  },
  {
    en: 'Failed to load easy courses',
    zh: '加载入门课程失败'
  }
)
const mediumCourses = useQuery(
  async () => {
    return listStoryLine('medium')
  },
  {
    en: 'Failed to load medium courses',
    zh: '加载入中级课程失败'
  }
)
const hardCourses = useQuery(
  async () => {
    return listStoryLine('hard')
  },
  {
    en: 'Failed to load hard courses',
    zh: '加载高级课程失败'
  }
)
</script>

<style lang="scss" scoped>
.main{
  padding-top: 10px;
}
</style>
