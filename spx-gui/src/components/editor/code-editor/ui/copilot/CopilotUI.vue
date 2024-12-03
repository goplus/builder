<script setup lang="ts">
import { UIIcon } from '@/components/ui'
import { useCodeEditorCtx } from '../CodeEditorUI.vue'

const codeEditorCtx = useCodeEditorCtx()

function handleClose() {
  codeEditorCtx.ui.setIsCopilotActive(false)
}
</script>

<template>
  <div class="copilot-ui">
    TODO
    <UIIcon type="close" @click="handleClose" />
  </div>
</template>

<style lang="scss" scoped>
.copilot-ui {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--ui-color-grey-100);
}
</style>
