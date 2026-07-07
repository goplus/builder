<template>
  <UIDropdown trigger="click" placement="bottom-start">
    <template #trigger>
      <button
        v-radar="{ name: 'Tutorial menu button', desc: 'Click to open tutorial options' }"
        class="tutorial-navbar-exit"
      >
        <UIIcon class="h-5 w-5" type="tutorial" />
        <UIIcon class="tutorial-navbar-exit-arrow" type="arrowMini" />
      </button>
    </template>
    <UIMenu class="min-w-30">
      <UIMenuItem v-radar="{ name: 'Exit Tutorial', desc: 'Click to exit the tutorial' }" @click="handleExitTutorial">
        {{ $t({ en: 'Exit Tutorial', zh: '退出教程' }) }}
      </UIMenuItem>
    </UIMenu>
  </UIDropdown>
</template>

<script setup lang="ts">
import { UIDropdown, UIIcon, UIMenu, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useTutorial } from './tutorial'

const tutorial = useTutorial()

const handleExitTutorial = useMessageHandle(
  () => tutorial.endCurrentCourse(),
  { en: 'Failed to exit tutorial', zh: '退出教程失败' }
).fn
</script>

<style scoped>
.tutorial-navbar-exit {
  height: 44px;
  min-width: 102px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 0;
  background: #e7f8f7;
  color: #36bcc4;
  cursor: pointer;
  line-height: 0;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;
}

.tutorial-navbar-exit:hover {
  background: #d8f4f3;
  color: #1aa9b3;
}

.tutorial-navbar-exit-arrow {
  width: 8px;
  height: 8px;
}
</style>
