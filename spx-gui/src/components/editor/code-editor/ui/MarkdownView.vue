<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import MarkdownView from '@/components/common/markdown-vue/MarkdownView'
import type { MarkdownStringFlag } from '../common'
import DefinitionOverviewWrapper from './DefinitionOverviewWrapper.vue'
import DefinitionDetail from './DefinitionDetail.vue'

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
   * <definition-overview-wrapper>
   *   func onStart(callback func())
   * </definition-overview-wrapper>
   * ```
   */
  'definition-overview-wrapper': DefinitionOverviewWrapper
}
const advancedComponents = {
  ...basicComponents,
  /**
   * Usage:
   * ```html
   * <definition-detail id="gop:fmt?Println">
   *   Default detail content here (Markdown supported)
   * </definition-detail>
   */
  'definition-detail': DefinitionDetail
}

const components = computed(() => (props.flag === 'advanced' ? advancedComponents : basicComponents))
const markdownValue = computed(() => (typeof props.value === 'string' ? props.value : i18n.t(props.value)))
</script>

<template>
  <MarkdownView class="markdown-view" :value="markdownValue" :components="components" />
</template>

<style lang="scss" scoped>
.markdown-view {
  :deep(ul) {
    list-style: square;
  }
  :deep(ol) {
    list-style: decimal;
  }
  :deep(code) {
    // TODO: keep consistent with component `UICode`
    display: inline-block;
    line-height: 1.6;
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid var(--ui-color-grey-500);
    background: var(--ui-color-grey-300);
  }
}
</style>
