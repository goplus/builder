<script lang="ts" setup>
import { computed } from 'vue'

import { useTutorial } from './tutorial'
import { UIDropdownWithTooltip, UIIcon, UIMenu, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'

const tutorial = useTutorial()

const course = computed(() => tutorial.currentCourse)

const { fn: handleExitCourse } = useMessageHandle(() => tutorial.exitCurrentCourse(), {
  en: 'Failed to exit course',
  zh: '退出课程失败'
})
</script>

<template>
  <UIDropdownWithTooltip placement="bottom">
    <template #trigger>
      <button
        v-radar="{
          name: 'Tutorial course entry',
          desc: 'Shows the course in progress; click to see course options (e.g. exit course)'
        }"
        class="h-full flex cursor-pointer items-center gap-1 border-none bg-primary-200 px-3 text-primary-main outline-none hover:bg-primary-300"
      >
        <UIIcon class="h-5 w-5" type="tutorial" />
        <UIIcon class="h-2 w-2" type="arrowMini" />
      </button>
    </template>

    <template #dropdown-content>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Exit course', desc: 'Click to exit the current course and return to the course list' }"
          @click="handleExitCourse"
        >
          {{ $t({ en: 'Exit course', zh: '退出课程' }) }}
        </UIMenuItem>
      </UIMenu>
    </template>

    <template #tooltip-content>
      {{
        $t({
          zh: `${course?.title}课程中`,
          en: `${course?.title} in progress`
        })
      }}
    </template>
  </UIDropdownWithTooltip>
</template>
