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
    <template #trigger="{ dropdownVisible }">
      <button
        v-radar="{
          name: 'Tutorial course entry',
          desc: 'Shows the course in progress; click to open the tutorial control center'
        }"
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
