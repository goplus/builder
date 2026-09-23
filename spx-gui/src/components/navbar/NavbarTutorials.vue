<template>
  <UIDropdownWithTooltip v-if="currentCourse != null" placement="bottom">
    <template #trigger>
      <button
        v-radar="{ name: 'navbar-tutorials-status', desc: 'Show current course status and course actions' }"
        type="button"
        :aria-label="
          $t({
            en: `${currentCourse.courseTitle}, ${currentCourse.state === 'completed' ? 'completed' : 'in progress'}`,
            zh: `${currentCourse.courseTitle}，${currentCourse.state === 'completed' ? '已完成' : '学习中'}`
          })
        "
        class="h-full cursor-pointer flex items-center px-3"
      >
        <span class="h-7 flex items-center justify-center gap-1 rounded-full bg-primary-200 px-2 hover:bg-primary-300">
          <UIIcon class="h-5 w-5 text-primary-main" type="tutorial" />
          <span v-if="currentCourse.courseIndex != null" class="text-primary-main text-sm">
            {{ currentCourse.courseIndex }}/{{ currentCourse.courseCount }}
          </span>
          <UIIcon class="w-2 text-primary-main" type="arrowMini" />
        </span>
      </button>
    </template>

    <template #dropdown-content>
      <UIMenu>
        <UIMenuGroup class="pointer-events-none">
          <div class="flex flex-col gap-1 px-2 py-1">
            <div class="text-title">{{ currentCourse.courseTitle }}</div>
            <div class="text-grey-700 text-sm">{{ currentCourse.seriesTitle }}</div>
            <div v-if="currentCourse.courseIndex != null" class="text-grey-700 text-sm">
              {{
                $t({
                  en: `Course ${currentCourse.courseIndex} of ${currentCourse.courseCount}`,
                  zh: `第 ${currentCourse.courseIndex} / ${currentCourse.courseCount} 课`
                })
              }}
            </div>
            <div class="text-primary-main text-sm">
              {{
                $t(
                  currentCourse.state === 'completed'
                    ? { en: 'Completed', zh: '已完成' }
                    : { en: 'In progress', zh: '学习中' }
                )
              }}
            </div>
          </div>
        </UIMenuGroup>
        <UIMenuGroup>
          <UIMenuItem
            v-radar="{ name: 'exit-tutorial', desc: 'Click to exit the current tutorial course' }"
            @click="handleExitTutorial"
          >
            {{ $t({ en: 'Exit Tutorial', zh: '退出教程' }) }}
          </UIMenuItem>
        </UIMenuGroup>
      </UIMenu>
    </template>

    <template #tooltip-content>
      {{
        $t({
          en: `${currentCourse.courseTitle} · ${currentCourse.state === 'completed' ? 'Completed' : 'In progress'}`,
          zh: `${currentCourse.courseTitle} · ${currentCourse.state === 'completed' ? '已完成' : '学习中'}`
        })
      }}
    </template>
  </UIDropdownWithTooltip>

  <UITooltip v-else placement="bottom">
    <template #trigger>
      <router-link
        v-radar="{ name: 'navbar-tutorials-link', desc: 'Click to open the tutorials page' }"
        class="h-full cursor-pointer flex items-center px-3 hover:bg-grey-400"
        to="/tutorials"
      >
        <UIIcon class="h-5 w-5 text-grey-1000" type="tutorial" />
      </router-link>
    </template>
    <div class="text">{{ $t({ en: 'Tutorials', zh: '教程' }) }}</div>
  </UITooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useMessageHandle } from '@/utils/exception'
import { UIDropdownWithTooltip, UIIcon, UIMenu, UIMenuGroup, UIMenuItem, UITooltip } from '@/components/ui'
import { useTutorialStatus } from '@/components/tutorials/status'
import { useTutorial } from '@/components/tutorials/tutorial'

const tutorialStatus = useTutorialStatus()
const tutorial = useTutorial()
const currentCourse = computed(() => tutorialStatus.currentCourse)

const { fn: handleExitTutorial } = useMessageHandle(() => tutorial.endCurrentCourse(), {
  zh: '退出课程时遇到问题',
  en: 'Encountered an issue when exiting the course'
})
</script>
