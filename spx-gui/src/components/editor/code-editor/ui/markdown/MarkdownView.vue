<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import MarkdownView from '@/components/common/markdown-vue/MarkdownView'
import type { MarkdownStringFlag } from '../../common'
import DefinitionItem from '../definition/DefinitionItem.vue'
import CodeLink from './CodeLink'
import CodeBlock from './CodeBlock.vue'
import CodeChange from './CodeChange.vue'
import ResourcePreview from './ResourcePreview.vue'
import DiagnosticItem from './DiagnosticItem.vue'

const props = withDefaults(
  defineProps<{
    flag?: MarkdownStringFlag
    /** Markdown string with MDX support. */
    value: string | LocaleMessage
  }>(),
  { flag: 'basic' as MarkdownStringFlag }
)

const i18n = useI18n()

const basicComponents = {
  /**
   * Usage:
   * ```html
   * <code-link file="file:///NiuXiaoQi.spx" position="10,20">Default link text</code-link>
   * ```
   */
  'code-link': CodeLink,
  /**
   * Usage:
   * ```html
   * <pre is="code-change" file="file:///NiuXiaoQi.spx" line-range="1-10">
   *   New code content here
   * </pre>
   * ```
   */
  'code-change': CodeChange,
  /**
   * Usage:
   * ```html
   * <resource-preview resource="spx://resources/sprites/NiuXiaoQi" />
   * ```
   */
  'resource-preview': ResourcePreview,
  /**
   * Usage:
   * ```html
   * <diagnostic-item severity="error">
   *   Diagnostic message here (Markdown supported)
   * </diagnostic-item>
   */
  'diagnostic-item': DiagnosticItem
}
const advancedComponents = {
  ...basicComponents,
  /**
   * Usage:
   * ```html
   * <definition-item def-id="gop:fmt?Println" overview="func Println(a ...interface{}) void">
   *   Default detail content here (Markdown supported)
   * </definition-item>
   */
  'definition-item': DefinitionItem
}

const components = computed(() => {
  const customComponents = props.flag === 'advanced' ? advancedComponents : basicComponents
  return {
    codeBlock: CodeBlock,
    custom: customComponents
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

  font-size: 12px;
  line-height: 1.75;
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
    color: inherit;
    text-decoration: underline;
    &:hover,
    &:active {
      color: var(--ui-color-primary-main);
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
    font-size: 0.83em;
    line-height: 1.6;
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid var(--ui-color-grey-500);
    background: var(--ui-color-grey-300);
    word-break: break-word;
    overflow-wrap: break-word;
  }
}
</style>
