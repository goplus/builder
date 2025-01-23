<script setup lang="ts">
import { useSlotText } from '@/utils/vnode'
import type { DefinitionKind } from '../../common'
import CodeView from '../markdown/CodeView.vue'
import DefinitionIcon from './DefinitionIcon.vue'

defineProps<{
  kind?: DefinitionKind
}>()

const childrenText = useSlotText('default', true)
</script>

<template>
  <div class="definition-overview-wrapper" :title="childrenText">
    <DefinitionIcon v-if="kind != null" class="icon" :kind="kind" />
    <CodeView class="code" mode="inline"><slot></slot></CodeView>
  </div>
</template>

<style lang="scss" scoped>
.definition-overview-wrapper {
  display: flex;
  color: var(--ui-color-title);

  font-size: 12px;
  line-height: 1.75;

  .icon {
    flex: 0 0 auto;
    margin-top: 2px;
    margin-right: 4px;
  }

  .code {
    flex: 1 1 0;
    word-break: break-word;

    // Clear style from `code` in `MarkdownView`
    font-size: inherit;
    line-height: inherit;
    padding: 0;
    border-radius: 0;
    border: none;
    background: none;
  }
}
</style>
