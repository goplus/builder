<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { Course } from '@/apis/course'
import { UITextInput, UIIcon, UIEmpty, UILoading } from '@/components/ui'
import CourseItemMini from './CourseItemMini.vue'

const props = defineProps<{
  courses: Course[]
  selectedIds: string[]
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const searchKeyword = ref('')

const filteredCourses = computed(() => {
  const keyword = searchKeyword.value.toLowerCase().trim()
  if (!keyword) return props.courses

  return props.courses.filter((course) => {
    return course.title.toLowerCase().includes(keyword)
  })
})

const availableCourses = computed(() => {
  return filteredCourses.value.filter((course) => !props.selectedIds.includes(course.id))
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="border-b border-dividing-line-2 p-3">
      <UITextInput v-model:value="searchKeyword" :placeholder="$t({ en: 'Search courses...', zh: '搜索课程...' })">
        <template #prefix>
          <UIIcon type="search" />
        </template>
      </UITextInput>
    </div>

    <div class="flex-1 overflow-y-auto p-3">
      <UILoading v-if="loading" />
      <UIEmpty
        v-else-if="availableCourses.length === 0"
        size="small"
        :description="
          searchKeyword
            ? $t({ en: 'No matching courses found', zh: '没有找到匹配的课程' })
            : $t({ en: 'All courses have been selected', zh: '所有课程都已选择' })
        "
      />
      <div v-else class="flex flex-col gap-2">
        <CourseItemMini
          v-for="course in availableCourses"
          :key="course.id"
          :course="course"
          interactive
          class="group"
          @click="emit('select', course.id)"
        >
          <template #suffix>
            <UIIcon
              class="shrink-0 text-grey-400 transition-colors duration-200 group-hover:text-primary-600"
              type="plus"
            />
          </template>
        </CourseItemMini>
      </div>
    </div>
  </div>
</template>
