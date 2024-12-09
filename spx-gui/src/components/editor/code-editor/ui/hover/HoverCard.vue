<script setup lang="ts">
import { UIButton } from '@/components/ui'
import { useCodeEditorCtx } from '../CodeEditorUI.vue'
import type { Action } from '../../common'
import MarkdownView from '../markdown/MarkdownView.vue'
import type { HoverController, InternalHover } from '.'

const props = defineProps<{
  hover: InternalHover
  controller: HoverController
}>()

const codeEditorCtx = useCodeEditorCtx()

function handleAction(action: Action) {
  // TODO: exception handling
  codeEditorCtx.ui.executeCommand(action.command, ...action.arguments)
  props.controller.hideHover()
}
</script>

<template>
  <section class="hover-card">
    <ul class="contents">
      <li v-for="(content, i) in hover.contents" :key="i" class="content">
        <MarkdownView v-bind="content" />
      </li>
    </ul>
    <footer v-if="hover.actions.length > 0" class="actions">
      <UIButton v-for="(action, i) in hover.actions" :key="i" @click="handleAction(action)">
        {{ action.title }}
      </UIButton>
    </footer>
  </section>
</template>

<style lang="scss" scoped>
.hover-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 4px;
  background-color: #fff;
  border: 1px solid #333;
}

.content {
  white-space: pre;
}

.actions {
  padding: 4px 0 0;
  border-top: 1px solid #333;
}
</style>
