<script setup lang="ts">
import { computed } from 'vue'
import type { InternalAction } from '..'
import { useCodeEditorCtx } from '../CodeEditorUI.vue'
import MarkdownView from '../markdown/MarkdownView.vue'
import CodeEditorCard from '../CodeEditorCard.vue'
import type { HoverController, InternalHover } from '.'
import ActionButton from './ActionButton.vue'

const props = defineProps<{
  hover: InternalHover
  controller: HoverController
}>()

const codeEditorCtx = useCodeEditorCtx()

const actions = computed(() => {
  return props.hover.actions.map((a) => codeEditorCtx.ui.resolveAction(a)).filter((a) => a != null) as InternalAction[]
})

async function handleAction(action: InternalAction) {
  // TODO: exception handling
  codeEditorCtx.ui.executeCommand(action.command, ...action.arguments)
  props.controller.hideHover()
}
</script>

<template>
  <CodeEditorCard class="hover-card">
    <ul class="body">
      <li v-for="(content, i) in hover.contents" :key="i" class="content">
        <MarkdownView v-bind="content" />
      </li>
    </ul>
    <footer v-if="actions.length > 0" class="footer">
      <ActionButton
        v-for="(action, i) in actions"
        :key="i"
        :icon="action.commandInfo.icon"
        @click="handleAction(action)"
      >
        {{ action.title }}
      </ActionButton>
    </footer>
  </CodeEditorCard>
</template>

<style lang="scss" scoped>
.hover-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 8px;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content {
  width: 320px;
  padding: 6px 8px;
  // TODO: reconfirm font size here
  font-size: 12px;
}

.footer {
  margin-top: 6px;
  padding: 14px 8px 8px;
  display: flex;
  gap: 12px;
  border-top: 1px solid var(--ui-color-dividing-line-2);
}
</style>
