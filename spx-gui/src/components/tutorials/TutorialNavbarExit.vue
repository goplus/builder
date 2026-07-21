<script lang="ts" setup>
import { computed } from 'vue'
import { useTutorial } from './tutorial'
import { UIDropdownWithTooltip, UIIcon } from '@/components/ui'
import TutorialControlCenter from './TutorialControlCenter.vue'

const tutorial = useTutorial()
const course = computed(() => tutorial.currentCourse)
</script>

<template>
  <UIDropdownWithTooltip placement="bottom">
    <template #trigger>
      <button
        v-radar="{
          name: 'Tutorial course entry',
          desc: 'Shows the course in progress; click to open the tutorial control center'
        }"
        class="h-full flex cursor-pointer items-center gap-1 border-none bg-primary-200 px-3 text-primary-main outline-none hover:bg-primary-300"
      >
        <UIIcon class="h-5 w-5" type="tutorial" />
        <UIIcon class="h-2 w-2" type="arrowMini" />
      </button>
    </template>

    <template #dropdown-content>
      <TutorialControlCenter />
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
