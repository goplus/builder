<script lang="ts" setup>
import { computed } from 'vue'

import { useTutorial } from './tutorial'
import { UIDropdownWithTooltip, UIIcon, UIMenu, UIMenuItem, useConfirmDialog } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'

const tutorial = useTutorial()
const i18n = useI18n()
const confirm = useConfirmDialog()

const course = computed(() => tutorial.currentCourse)

const { fn: handleExitCourse } = useMessageHandle(() => tutorial.exitCurrentCourse(), {
  en: 'Failed to exit course',
  zh: '退出课程失败'
})

const { fn: handleRestartCourse } = useMessageHandle(
  async () => {
    await confirm({
      title: i18n.t({ en: 'Restart course', zh: '重新开始课程' }),
      content: i18n.t({
        en: 'The course will start over and your changes to the course project will be discarded. Are you sure to continue?',
        zh: '课程将重新开始，你对课程项目的修改将被丢弃，确定继续吗？'
      })
    })
    await tutorial.restartCurrentCourse()
  },
  {
    en: 'Failed to restart course',
    zh: '重新开始课程失败'
  }
)
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
        <div class="max-w-60 truncate px-2 pb-2 pt-1 text-xs text-hint-2">
          {{
            $t({
              zh: `${course?.title}课程中`,
              en: `${course?.title} in progress`
            })
          }}
        </div>
        <UIMenuItem
          v-radar="{ name: 'Restart course', desc: 'Click to restart the current course from its initial state' }"
          @click="handleRestartCourse"
        >
          {{ $t({ en: 'Restart course...', zh: '重新开始课程...' }) }}
        </UIMenuItem>
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
