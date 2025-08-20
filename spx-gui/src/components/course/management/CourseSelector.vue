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
  <div class="course-selector">
    <div class="search-bar">
      <UITextInput v-model:value="searchKeyword" :placeholder="$t({ en: 'Search courses...', zh: '搜索课程...' })">
        <template #prefix>
          <UIIcon type="search" />
        </template>
      </UITextInput>
    </div>

    <div class="course-list">
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
      <div v-else class="course-items">
        <CourseItemMini
          v-for="course in availableCourses"
          :key="course.id"
          :course="course"
          interactive
          @click="emit('select', course.id)"
        >
          <template #suffix>
            <UIIcon class="action-icon" type="plus" />
          </template>
        </CourseItemMini>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.course-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-bar {
  padding: 12px;
  border-bottom: 1px solid var(--ui-color-divider-subtle);
}

.course-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.course-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-icon {
  color: var(--ui-color-grey-400);
  flex-shrink: 0;
  transition: color 0.2s;
}

.course-items :deep(.course-item-mini:hover) .action-icon {
  color: var(--ui-color-primary-600);
}
</style>
