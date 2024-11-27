<script setup lang="ts">
import { UIButton } from '@/components/ui'
import { useCodeEditorCtx } from '../CodeEditorUI.vue'
import type { Action } from '../../common'
import MarkdownView from '../MarkdownView.vue'
import type { InternalHover } from '.'

defineProps<{
  hover: InternalHover
}>()

const codeEditorCtx = useCodeEditorCtx()

function handleAction(action: Action) {
  // TODO: exception handling
  codeEditorCtx.ui.executeCommand(action.command, ...action.arguments)
}
</script>

<template>
  <section class="hover-card">
    <ul class="contents">
      <li v-for="(content, i) in hover.contents" :key="i" class="content">
        <MarkdownView v-bind="content" />
      </li>
    </ul>
    <footer class="actions">
      <UIButton v-for="(action, i) in hover.actions" :key="i" @click="handleAction(action)">
        {{ action.title }}
      </UIButton>
    </footer>
  </section>
</template>

<style lang="scss" scoped>
.hover-card {
  padding: 4px;
  background-color: #fff;
  border: 1px solid #333;
}

.content {
  white-space: pre;
}
</style>
