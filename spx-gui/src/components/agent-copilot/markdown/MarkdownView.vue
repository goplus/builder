<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import MarkdownView from '@/components/common/markdown-vue/MarkdownView'
import CodeBlock from './CodeBlock.vue'
import UseMcpTool from './UseMcpTool.vue'
import ToolEcecResult from './ToolExecResult.vue'
import FileContent from './FileContent.vue'
import FileDiagnostics from './FileDiagnostics.vue'
import Env from './WorkflowEnv.vue'

const props = defineProps<{
  value: string | LocaleMessage
}>()

const i18n = useI18n()

const basicComponents = {
  /**
   * Usage:
   *  ```html
   * <pre is="file-diagnostics" file="src/main.ts">
   *        - Error: Missing semicolon
   *        - Warning: Unused variable
   * </pre>
   * ```
   */
  'file-diagnostics': FileDiagnostics,
  /**
   * Usage:
   *  ```html
   * <pre is="file-content" file="src/main.spx">
   *      onStart => {}
   * </pre>
   * ```
   */
  'file-content': FileContent,
  'final-file-content': FileContent,
  /**
   * Usage:
   *  ```html
   * <use-mcp-tool server="xbuilder-action" tool="create_project" arguments='{"projectName": "SnakeGame"}'/>
   * ```
   */
  'use-mcp-tool': UseMcpTool,
  /**
   * Usage:
   *  ```html
   * <pre is="tool-exec-result" server="xbuilder-action" tool="create_project" arguments='{"projectName": "SnakeGame"}'>
   *        result
   * </pre>
   * ```
   */
  'tool-exec-result': ToolEcecResult,
  /**
   * Usage:
   *  ```html
   * <env kname="MY_ENV" value="my_value"></env>
   * ```
   */
  env: Env
}

const components = computed(() => {
  return {
    codeBlock: CodeBlock,
    custom: basicComponents
  }
})
const markdownValue = computed(() => (typeof props.value === 'string' ? props.value : i18n.t(props.value)))
</script>

<template>
  <MarkdownView class="markdown-view" :value="markdownValue" :components="components" />
</template>

<style lang="scss" scoped>
.markdown-view {
  display: flex;
  flex-direction: column;
  gap: 1em;

  font-size: 13px;
  line-height: 1.7;
  color: inherit;

  :deep(h1, h2, h3, h4, h5, h6) {
    margin: 1em 0;
    color: var(--ui-color-title);
  }

  :deep(h1) {
    font-size: 20px;
    line-height: 1.4;
  }

  :deep(h2) {
    font-size: 16px;
    line-height: 1.625;
  }

  :deep(h3) {
    font-size: 14px;
    line-height: 1.57143;
  }

  :deep(h4, h5, h6) {
    font-size: 13px;
    line-height: 1.53846;
  }

  :deep(ul),
  :deep(ol) {
    display: flex;
    flex-direction: column;
    padding-left: 1.5em;
    gap: 8px;
  }
  :deep(ul) {
    list-style: square;
  }
  :deep(ol) {
    list-style: decimal;
  }
  :deep(li > *:not(:last-child)) {
    margin-bottom: 8px;
  }

  :deep(a) {
    color: var(--ui-color-turquoise-500);
    text-decoration: underline;
    &:hover {
      color: var(--ui-color-turquoise-400);
    }
    &:active {
      color: var(--ui-color-turquoise-600);
    }
  }

  :deep(blockquote) {
    position: relative;
    padding-left: 20px;
    &:before {
      content: '';
      position: absolute;
      left: 9px;
      top: 0;
      width: 2px;
      height: 100%;
      border-radius: 1px;
      background-color: var(--ui-color-grey-800);
    }
  }

  :deep(code) {
    font-family: var(--ui-font-family-code);
  }
  :deep(:not(pre) > code) {
    // TODO: keep consistent with component `UICode`
    font-size: 0.92em;
    line-height: 2;
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid var(--ui-color-grey-500);
    background: var(--ui-color-grey-300);
    word-break: break-word;
    overflow-wrap: break-word;
  }
}
</style>
