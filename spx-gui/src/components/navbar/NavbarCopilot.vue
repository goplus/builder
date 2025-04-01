<!-- eslint-disable vue/no-v-html -->
<template>
    <UITooltip placement="bottom">
      <template #trigger>
        <div class="copilot" @click="handleCopilotTriggerClick" v-html="logoSimpleSvg"></div>
      </template>
      {{ $t({ en: 'Ask copilot', zh: '向 Copilot 提问' }) }}
    </UITooltip>
  </template>
  
  <script setup lang="ts">
  import { UITooltip } from '@/components/ui'
  import { useCopilotStore} from '@/utils/utils'
  import logoSimpleSvg from '@/components/editor/code-editor/ui/copilot/logo-simple.svg?raw'

  const copilotVisible = useCopilotStore()

  function handleCopilotTriggerClick() {
    copilotVisible.value = !copilotVisible.value
  }
  </script>
  
  <style lang="scss" scoped>
  .copilot {
    height: 100%;
    padding: 0 20px;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: white; /* This sets the SVG color through currentColor */
  
    &:hover {
      background-color: var(--ui-color-primary-600);
    }
  }
  </style>
  