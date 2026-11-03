<script lang="ts" setup>
import { isPlaygroundCourse, type Course } from '@/apis/course'
import type { LocaleMessage } from '@/utils/i18n'
import { UIDropdown, UIIcon, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'

withDefaults(
  defineProps<{
    course: Course
    /** In a series divided into units, the other units the course can be moved to. */
    moveTargets?: Array<{ unitIndex: number; label: LocaleMessage }>
    /** Whether a new unit can start at the course, which is then not the first of its unit. */
    canSplit?: boolean
  }>(),
  {
    moveTargets: () => [],
    canSplit: false
  }
)

const emit = defineEmits<{
  /** Edit a Guided Course, whose form is all of it. */
  edit: []
  /** Open a Playground Course in the Course Editor. */
  openEditor: []
  /** Start a new unit at the course. */
  split: []
  moveToUnit: [unitIndex: number]
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

      <UIMenuGroup v-if="canSplit || moveTargets.length > 0">
        <UIMenuItem v-if="canSplit" @click="emit('split')">
          {{ $t({ en: 'Start a new unit here', zh: '从这节课起拆分新单元' }) }}
        </UIMenuItem>
        <UIMenuItem v-for="target in moveTargets" :key="target.unitIndex" @click="emit('moveToUnit', target.unitIndex)">
          {{ $t({ en: `Move to ${target.label.en}`, zh: `移到${target.label.zh}` }) }}
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
