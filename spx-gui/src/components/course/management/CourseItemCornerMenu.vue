<script lang="ts" setup>
import { isPlaygroundCourse, type Course } from '@/apis/course'
import { UIDropdown, UIIcon, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'

defineProps<{
  course: Course
}>()

const emit = defineEmits<{
  /** Edit a Guided Course, whose form is all of it. */
  edit: []
  /** Open a Playground Course in the Course Editor. */
  openEditor: []
  remove: []
}>()
</script>

<template>
  <UIDropdown trigger="click" placement="bottom-end">
    <template #trigger>
      <div
        v-radar="{ name: 'course-menu', desc: 'Click to open the actions for the course' }"
        class="corner-menu h-8 w-8 cursor-pointer flex items-center justify-center rounded-full bg-grey-100 text-grey-800 transition-all duration-100 hover:bg-primary-main hover:text-grey-100"
        @click.stop.prevent
      >
        <UIIcon class="w-5.25 h-5.25" type="more" />
      </div>
    </template>
    <UIMenu>
      <UIMenuGroup>
        <UIMenuItem v-if="isPlaygroundCourse(course)" @click="emit('openEditor')">
          {{ $t({ en: 'Edit course', zh: '编辑课程' }) }}
        </UIMenuItem>
        <UIMenuItem v-else @click="emit('edit')">
          {{ $t({ en: 'Edit', zh: '编辑' }) }}
        </UIMenuItem>
      </UIMenuGroup>

      <UIMenuGroup>
        <UIMenuItem @click="emit('remove')">
          {{ $t({ en: 'Delete', zh: '删除' }) }}
        </UIMenuItem>
      </UIMenuGroup>
    </UIMenu>
  </UIDropdown>
</template>
