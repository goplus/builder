<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { type CompletionMenu, resolveSuggestMatches2Highlight } from './completion-menu'
import EditorMenu from '../../EditorMenu.vue'
import { determineClosestEdge, isElementInViewport } from '../../common'
import type { Icon, LayerContent } from '@/components/editor/code-editor/EditorUI'
import DocumentPreview from '@/components/editor/code-editor/ui/features/hover-preview/DocumentPreview.vue'
import type { CompletionMenuFeatureItem } from '@/components/editor/code-editor/ui/features/completion-menu/completion'

interface CompletionMenuItem {
  key: number
  icon: Icon
  label: string
  iconSize: number
  active: boolean
  matches: {
    text: string
    highlighted: boolean
  }[]
  preview?: LayerContent
}

const props = defineProps<{
  completionMenu: CompletionMenu
}>()
const completionMenuState = props.completionMenu.completionMenuState
// for using generic vue component can't use `InstanceType<type of someGenericComponent>` it will throw error. issue: https://github.com/vuejs/language-tools/issues/3206
const editorMenuRef = ref<{
  editorMenuElement: HTMLUListElement
  editorMenuContainerElement: HTMLElement
}>()
const cssLineHeight = computed(() => `${completionMenuState.lineHeight}px`)
const cssFontSize = computed(() => `${completionMenuState.fontSize}px`)
const itemHeight = computed(
  () =>
    completionMenuState.fontSize *
      // fontSize * 1.57134 means line height, normally line height is set to 1.5, but in current ui config it was set 1.57134
      // 8 means padding top 4 and padding bottom 4
      1.57143 +
    8
)
const menuItems = computed<CompletionMenuItem[]>(() =>
  props.completionMenu.completionMenuState.suggestions.map((item, i) => ({
    key: i,
    icon: item.icon,
    label: item.label,
    // make menu icon slightly larger than fontSize for better display
    iconSize: completionMenuState.fontSize * 1.1,
    active: completionMenuState.activeIdx === i,
    preview: item.preview,
    // `matches` is not required in `EditorMenu.vue`, but required in `CompletionMenuComponent.vue`.
    // `EditorMenu.vue` can pass any data to default slot if you set, so here we need pass `matches`
    matches: resolveSuggestMatches2Highlight(item.label, item.matches)
  }))
)

watchEffect(() => {
  const completionMenuElement = editorMenuRef.value?.editorMenuContainerElement
  if (!completionMenuElement) return
  props.completionMenu.completionMenuState.completionMenuElement = completionMenuElement
})

function handleActiveMenuItem(menuItemElement: HTMLLIElement) {
  const editorMenuElement = editorMenuRef.value?.editorMenuElement
  if (!menuItemElement || !editorMenuElement) return
  if (isElementInViewport(editorMenuElement, menuItemElement)) return
  // in `menuItemElement` we have padding top 4px and padding bottom 4px, so we need divide item by 4
  const top =
    determineClosestEdge(editorMenuElement, menuItemElement) === 'top'
      ? menuItemElement.offsetTop - 4
      : menuItemElement.offsetTop -
        editorMenuElement.clientHeight +
        menuItemElement.clientHeight -
        4
  editorMenuRef.value?.editorMenuElement.scrollTo({ top })
}

const activeCompletionMenuItem = computed<CompletionMenuFeatureItem | null>(() => {
  return completionMenuState.suggestions[completionMenuState.activeIdx]
})

function handleMenuItemSelect(item: CompletionMenuItem) {
  props.completionMenu.select(item.key)
}
</script>

<template>
  <div
    class="completion-menu-wrapper"
    :style="{
      top: completionMenuState.position.top + 'px',
      left: completionMenuState.position.left + 'px'
    }"
  >
    <EditorMenu
      v-show="completionMenuState.visible && menuItems.length"
      ref="editorMenuRef"
      class="completion-menu"
      :items="menuItems"
      :list-styles="{
        maxHeight: 8 * itemHeight + 'px'
      }"
      @select="handleMenuItemSelect"
      @active="(_, el) => handleActiveMenuItem(el)"
    >
      <template #default="{ items: { matches } }">
        <span
          v-for="(match, i) in matches"
          :key="i"
          class="completion-menu__label"
          :class="{ 'completion-menu__label-match': match.highlighted }"
        >
          {{ match.text }}
        </span>
      </template>
    </EditorMenu>
    <transition name="slide">
      <!--  for single component add key to implement animation  -->
      <DocumentPreview
        v-if="activeCompletionMenuItem?.preview?.type === 'doc'"
        :key="activeCompletionMenuItem.preview.layer.header?.declaration"
        class="completion-document"
        :recommend-action="activeCompletionMenuItem.preview.layer.recommendAction"
        :more-actions="activeCompletionMenuItem.preview.layer.moreActions"
        :header="activeCompletionMenuItem.preview.layer.header"
        :content="activeCompletionMenuItem.preview.layer.content"
      ></DocumentPreview>
    </transition>
  </div>
</template>
<style lang="scss">
// hidden monaco suggest widget
div[widgetid='editor.widget.suggestWidget'].suggest-widget {
  display: none !important;
}

// this is global css and active in monaco editor code line, add `.view-line` to avoid style override by monaco editor
.view-line .completion-menu__item-preview {
  color: grey;
  font-size: inherit;
  line-height: inherit;
  font-style: italic;
  font-family: var(--ui-font-family-code);
  animation: fade-in 150ms ease-in;
  white-space: pre;
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
.completion-menu-wrapper {
  z-index: 999;
  position: absolute;
  top: 0;
  right: 0;
  max-width: 430px;
  transform: translateY(0);
  transition: 150ms left cubic-bezier(0.1, 0.93, 0.15, 1.5);
}

.completion-menu :deep(.editor-menu__item-icon) {
  color: #faa135;
}

.completion-menu--reverse-up {
  transform: translateY(calc(-100% - v-bind(cssLineHeight)));
}

.completion-menu__label {
  color: black;
  font-size: v-bind(cssFontSize);
}

.completion-menu__label-match {
  color: var(--ui-color-blue-500);
}

.completion-document {
  position: absolute;
  top: 0;
  right: -4px;
  transform: translateX(100%);

  &.slide-enter-active {
    transition: 0.3s cubic-bezier(0, 1.25, 1, 1);
  }
  &.slide-leave-active {
    transition: 0.3s cubic-bezier(0, 1.25, 1, 1);
  }

  &.slide-enter-from {
    opacity: 0;
    transform: translate(100%, 40px);
  }

  &.slide-leave-to {
    opacity: 0;
    transform: translate(100%, -40px);
  }
}
</style>
