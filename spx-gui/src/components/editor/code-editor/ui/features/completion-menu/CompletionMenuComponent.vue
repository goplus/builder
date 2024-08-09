<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { type VirtualListInst, NVirtualList } from 'naive-ui'
import { type CompletionMenu, resolveSuggestMatches2Highlight } from './completion-menu'
import EditorMenu from '@/components/editor/code-editor/ui/EditorMenu.vue'
import { IconEnum } from '@/components/editor/code-editor/common'

interface CompletionMenuItem {
  idx: number
  icon: IconEnum
  label: string
  iconSize: number
  active: boolean
  matches: {
    text: string
    highlighted: boolean
  }[]
}

const props = defineProps<{
  completionMenu: CompletionMenu
}>()
const completionMenuState = props.completionMenu.completionMenuState
const editorMenuRef = ref<{
  virtualListRef: VirtualListInst & typeof NVirtualList
  $el: HTMLElement
}>()
const cssLineHeight = computed(() => `${completionMenuState.lineHeight}px`)
const cssFontSize = computed(() => `${completionMenuState.fontSize}px`)
const itemHeight = computed(() => completionMenuState.fontSize * 1.57143 + 8)
const menuItems = computed<CompletionMenuItem[]>(() =>
  props.completionMenu.completionMenuState.suggestions.map((item, i) => ({
    idx: i,
    icon: item.icon,
    label: item.label,
    // make menu icon slightly larger than fontSize for better display
    iconSize: completionMenuState.fontSize * 1.1,
    active: completionMenuState.activeIdx === i,
    // `matches` is not required in `EditorMenu.vue`, but required in `CompletionMenuComponent.vue`.
    // `EditorMenu.vue` can pass any data to default slot if you set, so here we need pass `matches`
    matches: resolveSuggestMatches2Highlight(item.label, item.matches)
  }))
)

watchEffect(() => {
  const $container = editorMenuRef.value?.$el
  if (!$container) return
  props.completionMenu.completionMenuState.$container = $container
})

watch(
  () => completionMenuState.activeIdx,
  (activeIdx) => {
    editorMenuRef.value?.virtualListRef.scrollTo({
      index: activeIdx
    })
  }
)

function handleMenuItemSelect(item: CompletionMenuItem) {
  props.completionMenu.select(item.idx)
}
</script>

<template>
  <editor-menu
    v-show="completionMenuState.visible"
    ref="editorMenuRef"
    class="completion-menu"
    :items="menuItems"
    :style="{
      top: completionMenuState.position.top + 'px',
      left: completionMenuState.position.left + 'px'
    }"
    :list-styles="{
      maxHeight: 8 * itemHeight + 'px'
    }"
    @select="handleMenuItemSelect"
  >
    <template #default="{ matches }">
      <span
        v-for="(match, j) in matches"
        :key="j"
        class="completion-menu__label"
        :class="{ 'completion-menu__label-match': match.highlighted }"
      >
        {{ match.text }}
      </span>
    </template>
  </editor-menu>
</template>
<style lang="scss">
// hidden monaco suggest widget
div[widgetid='editor.widget.suggestWidget'].suggest-widget {
  z-index: -999;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

.view-line .completion-menu__item-preview {
  color: grey;
  font-size: var(--vscode-editorCodeLens-fontSize);
  line-height: var(--vscode-editorCodeLens-lineHeight);
  font-style: italic;
  font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace;
  animation: fade-in 150ms ease-in;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
<style scoped lang="scss">
.completion-menu {
  z-index: 999;
  position: absolute;
  top: 0;
  right: 0;
  max-width: 430px;
  transform: translateY(0);
  transition: 150ms left cubic-bezier(0.1, 0.93, 0.15, 1.5);
}

.completion-menu--reverse-up {
  transform: translateY(calc(-100% - v-bind(cssLineHeight)));
}

.completion-menu__label {
  font-size: v-bind(cssFontSize);
}

.completion-menu__label-match {
  color: var(--ui-color-blue-500);
}
</style>
