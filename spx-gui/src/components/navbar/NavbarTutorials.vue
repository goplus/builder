<template>
  <UIDropdownWithTooltip v-if="currentCourse != null" placement="bottom">
    <template #trigger="{ dropdownVisible }">
      <button
        v-radar="{
          name: 'Tutorial course entry',
          desc: 'Shows the course in progress; click to open the tutorial control center'
        }"
        type="button"
        :aria-label="$t({ en: 'Tutorial course entry', zh: '教程入口' })"
        class="h-full flex cursor-pointer items-center border-none bg-transparent px-3 outline-none transition-colors hover:bg-grey-300"
        :class="{ 'bg-grey-400!': dropdownVisible }"
      >
        <span class="flex items-center rounded-full bg-primary-200 py-0 pl-1 pr-2 text-primary-main">
          <span class="flex h-7 w-7 items-center justify-center">
            <UIIcon class="h-5 w-5" type="tutorial" />
          </span>
          <UIIcon class="h-2 w-2" type="arrowMini" />
        </span>
      </button>
    </template>

    <template #dropdown-content>
      <TutorialStatusControlCenter />
    </template>

    <template #tooltip-content>
      {{
        $t({
          en: `${currentCourse.courseTitle}${currentCourse.state === 'completed' ? ' completed' : ' in progress'}`,
          zh: `${currentCourse.courseTitle}${currentCourse.state === 'completed' ? '已完成' : '学习中'}`
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

import { UIDropdownWithTooltip, UIIcon, UITooltip } from '@/components/ui'
import { useTutorialStatus } from '@/components/tutorials/status'
import TutorialStatusControlCenter from '@/components/tutorials/TutorialStatusControlCenter.vue'

const tutorialStatus = useTutorialStatus()
const currentCourse = computed(() => tutorialStatus.currentCourse)
</script>
