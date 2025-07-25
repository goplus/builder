<script lang="ts" setup>
import { computed, ref, nextTick } from 'vue'
import type { Course } from '@/apis/course'
import { UIEmpty, UIIcon } from '@/components/ui'
import CourseItemMini from './CourseItemMini.vue'

const props = defineProps<{
  courseIds: string[]
  allCourses: Course[]
}>()

const emit = defineEmits<{
  'update:courseIds': [ids: string[]]
}>()

const selectedCourses = computed(() => {
  const courseMap = new Map(props.allCourses.map((c) => [c.id, c]))
  return props.courseIds.map((id) => courseMap.get(id)).filter((c): c is Course => c != null)
})

const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function handleDragStart(e: DragEvent, index: number) {
  draggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    const target = e.target as HTMLElement
    target.style.opacity = '0.5'
  }
}

function handleDragEnd(e: DragEvent) {
  const target = e.target as HTMLElement
  target.style.opacity = ''
  draggedIndex.value = null
  dragOverIndex.value = null
}

function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

function handleDragLeave() {
  dragOverIndex.value = null
}

async function handleDrop(e: DragEvent, dropIndex: number) {
  e.preventDefault()

  if (draggedIndex.value === null || draggedIndex.value === dropIndex) {
    return
  }

  const newIds = [...props.courseIds]
  const [movedId] = newIds.splice(draggedIndex.value, 1)
  newIds.splice(dropIndex, 0, movedId)

  emit('update:courseIds', newIds)

  await nextTick()
  draggedIndex.value = null
  dragOverIndex.value = null
}

function removeCourse(index: number) {
  const newIds = [...props.courseIds]
  newIds.splice(index, 1)
  emit('update:courseIds', newIds)
}
</script>

<template>
  <div class="selected-courses-list">
    <UIEmpty
      v-if="selectedCourses.length === 0"
      size="small"
      :description="$t({ en: 'No courses selected', zh: '未选择任何课程' })"
    />
    <div v-else class="course-items">
      <div
        v-for="(course, index) in selectedCourses"
        :key="course.id"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragend="handleDragEnd"
        @dragover="handleDragOver($event, index)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, index)"
      >
        <CourseItemMini :course="course" :dimmed="draggedIndex === index" :highlighted="dragOverIndex === index">
          <template #prefix>
            <UIIcon class="drag-handle" type="exchange" />
          </template>
          <template #suffix>
            <UIIcon class="remove-icon" type="close" @click="removeCourse(index)" />
          </template>
        </CourseItemMini>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.selected-courses-list {
  height: 100%;
  overflow-y: auto;
  padding: 12px;
}

.course-items {
  display: flex;
  flex-direction: column;
  gap: 8px;

  > div {
    cursor: move;
  }
}

.drag-handle {
  color: var(--ui-color-grey-400);
  margin-right: 8px;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.remove-icon {
  color: var(--ui-color-grey-400);
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--ui-color-danger-600);
  }
}
</style>
