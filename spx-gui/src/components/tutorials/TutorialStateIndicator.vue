<script lang="ts">
export const name = 'tutorial-state-indicator'
</script>

<script lang="ts" setup>
import { computed } from 'vue'

import { useTutorial } from '@/components/tutorials/tutorial'
import { UIDropdownWithTooltip, UIIcon, UIMenu, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'

const tutorial = useTutorial()

const course = computed(() => {
  return tutorial.currentCourse
})

const { fn: handleExitTutorial } = useMessageHandle(
  () => {
    tutorial.endCurrentCourse()
  },
  { zh: '退出课程时遇到问题', en: 'Encountered an issue when exiting the course' }
)
</script>

<template>
  <UIDropdownWithTooltip placement="top">
    <template #trigger>
      <div
        class="h-7 w-13 cursor-pointer flex items-center justify-center gap-1 rounded-full bg-primary-200 hover:bg-primary-300"
      >
        <UIIcon class="text-primary-main" type="tutorial" />
        <UIIcon class="w-2 h-2 text-primary-main" type="arrowMini" />
      </div>
    </template>

    <template #dropdown-content>
      <UIMenu>
        <UIMenuItem v-radar="{ name: 'Exit Tutorial', desc: 'Click to exit the tutorial' }" @click="handleExitTutorial">
          {{ $t({ en: 'Exit Tutorial', zh: '退出教程' }) }}
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
