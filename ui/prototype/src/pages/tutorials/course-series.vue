<script setup lang="ts">
import { computed, onMounted } from 'vue'

import { getCourseSeries } from '@/apis/tutorials'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import TextView from '@/components/common/TextView.vue'
import CourseItem from '@/components/tutorials/CourseItem.vue'
import PrototypeCard from '@/components/ui/PrototypeCard.vue'

const props = defineProps<{
  courseSeriesIdInput: string
}>()

const series = computed(() => getCourseSeries(props.courseSeriesIdInput))

onMounted(() => {
  document.title = `${series.value.title} - XBuilder`
})
</script>

<template>
  <main class="flex min-h-screen min-w-360 flex-col bg-grey-300">
    <CommunityNavbar />
    <CenteredWrapper size="medium" class="flex-1 py-8">
      <PrototypeCard class="flex h-36 gap-8 bg-grey-100 p-5">
        <div class="h-full w-36 flex-none overflow-hidden rounded-sm bg-grey-300">
          <img class="size-full object-cover" :src="series.cover" :alt="series.title" />
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="m-0 truncate text-2xl font-medium text-title">{{ series.title }}</h1>
          <TextView class="mt-3 max-h-15 overflow-auto" :text="series.description" />
          <div class="mt-3 text-sm text-hint-1">{{ series.total }} · {{ series.updatedAt }}</div>
        </div>
      </PrototypeCard>

      <section class="mt-7">
        <h2 class="m-0 mb-4 text-xl font-normal text-title">Courses</h2>
        <ul class="m-0 grid list-none grid-cols-2 gap-5 p-0">
          <li v-for="course in series.courses" :key="course.id">
            <RouterLink class="block text-text no-underline" :to="`/course/${series.id}/${course.id}/start`">
              <CourseItem :course="course" />
            </RouterLink>
          </li>
        </ul>
      </section>
    </CenteredWrapper>
    <CommunityFooter />
  </main>
</template>
