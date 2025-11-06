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
      <div class="tutorial-state-indicator">
        <UIIcon class="icon-tutorial" type="tutorial" />
        <UIIcon class="icon-arrow" type="arrowAlt" />
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

<style lang="scss" scoped>
.tutorial-state-indicator {
  display: flex;
  gap: 4px;
  width: 52px;
  height: 28px;
  border-radius: 100px;
  background: var(--ui-color-primary-200);
  align-items: center;
  justify-content: center;

  .icon-tutorial {
    width: 16px;
    height: 16px;
    color: var(--ui-color-primary-main);
  }
  .icon-arrow {
    width: 10px;
    height: 10px;
    transform: rotate(180deg);
    color: var(--ui-color-primary-main);
  }

  &:hover {
    cursor: pointer;
    background: var(--ui-color-primary-300);
  }
}
</style>
