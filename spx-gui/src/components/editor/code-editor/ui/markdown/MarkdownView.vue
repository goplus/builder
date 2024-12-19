<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import MarkdownView from '@/components/common/markdown-vue/MarkdownView'
import type { MarkdownStringFlag } from '../../common'
import CodeLink from './CodeLink.vue'
import DefinitionOverviewWrapper from './DefinitionOverviewWrapper.vue'
import DefinitionDetail from './DefinitionDetail.vue'
import CodeBlock from './CodeBlock.vue'
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
   * <code-link file="file://NiuXiaoQi.spx" position="10,20">
   *   Default link text here
   * </code-link>
   * ```
   */
  'code-link': CodeLink,
  /**
   * Usage:
   * ```html
   * <definition-overview-wrapper>
   *   func onStart(callback func())
   * </definition-overview-wrapper>
   * ```
   */
  'definition-overview-wrapper': DefinitionOverviewWrapper,
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
   * <definition-detail def-id="gop:fmt?Println">
   *   Default detail content here (Markdown supported)
   * </definition-detail>
   */
  'definition-detail': DefinitionDetail
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
  gap: 12px;
  line-height: 1.53846;

  :deep(ul),
  :deep(ol) {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-left: 1.5em;
  }

  :deep(h4) {
    font-size: 1.2em;
  }
  :deep(ul) {
    list-style: square;
  }
  :deep(ol) {
    list-style: decimal;
  }
  :deep(code) {
    font-family: var(--ui-font-family-code);
  }
  :deep(:not(pre) > code) {
    // TODO: keep consistent with component `UICode`
    font-size: 0.85em;
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid var(--ui-color-grey-500);
    background: var(--ui-color-grey-300);
    word-break: break-word;
    overflow-wrap: break-word;
  }
  :deep(blockquote) {
    // TODO: confirm style detail here
    padding: 0 0.6em;
    border-radius: 4px;
    background-color: var(--ui-color-grey-300);
  }
}
</style>
