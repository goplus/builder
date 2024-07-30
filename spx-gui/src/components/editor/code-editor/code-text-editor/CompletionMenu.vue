<script setup lang="ts">
import { ref } from 'vue'
import { NScrollbar } from 'naive-ui'
import type { CompletionMenuItem } from './tools/completion'
import { determineClosestEdge, Icon2SVG, isElementInViewport } from './tools'
import type { ScrollbarInst } from 'naive-ui/es/scrollbar/src/Scrollbar'
import { normalizeIconSize } from './tools/common'
import type { IMatch } from './tools/monaco-editor-core'

withDefaults(
  defineProps<{
    suggestions?: CompletionMenuItem[]
    activeIdx?: number
  }>(),
  {
    activeIdx: 0,
    suggestions: () => []
  }
)

defineEmits<{
  select: [completionItem: CompletionMenuItem, idx: number]
}>()

const $completionMenu = ref<HTMLElement>()
const scrollbarRef = ref<typeof NScrollbar & ScrollbarInst>()

function handleActiveMenuItemUpdate($el: HTMLElement | null) {
  const $container = $completionMenu.value
  if (!$el || !$container || !scrollbarRef.value) return
  if (isElementInViewport($container, $el)) return
  const top =
    determineClosestEdge($container, $el) === 'top'
      ? $el.offsetTop
      : // 8 means padding top 4px and bottom 4px, can be replaced by computed element css prototype, or just keep it as 8px.
        $el.offsetTop - $container.clientHeight + $el.clientHeight + 8
  scrollbarRef.value.scrollTo({ top })
}

defineExpose({
  $container: $completionMenu
})

/**
 * resolve suggest matches to highlight, only used for split label and highlight
 * no need to move in common tools.
 * @param {string} label - raw text
 * @param {IMatch[]} matches - monaco match result
 * @returns {Array<{ text: string, highlighted: boolean }>}
 */
function resolveSuggestMatches2Highlight(
  label: string,
  matches: IMatch[]
): Array<{
  text: string
  highlighted: boolean
}> {
  const result = []
  let currentIndex = 0

  for (const match of matches) {
    const { start, end } = match

    if (currentIndex < start) {
      result.push({
        text: label.substring(currentIndex, start),
        highlighted: false
      })
    }

    result.push({
      text: label.substring(start, end),
      highlighted: true
    })

    currentIndex = end
  }

  if (currentIndex < label.length) {
    result.push({
      text: label.substring(currentIndex),
      highlighted: false
    })
  }

  return result
}
</script>

<template>
  <section ref="$completionMenu" class="completion-menu">
    <n-scrollbar ref="scrollbarRef" style="max-width: 1327px; max-height: 240px">
      <ul class="completion-menu__list">
        <!--
          this is completion item element, `click` need to be replaced by `mousedown` event for
          current project monitor original monaco completion hide event,
          when mouse clicked, original completion will be hidden before we can catch it,
          this menu will be hidden too, so we need to change custom `select` event to `mousedown` event.
        -->
        <li
          v-for="(suggestion, i) in suggestions"
          :key="i"
          :ref="($el) => activeIdx === i && handleActiveMenuItemUpdate($el as HTMLElement)"
          class="completion-menu__item"
          :class="{
            'completion-menu__item--active': activeIdx === i
          }"
          @mousedown="$emit('select', suggestion, i)"
        >
          <!-- eslint-disable vue/no-v-html -->
          <span
            :ref="($el) => normalizeIconSize($el as HTMLElement, 20)"
            class="completion-menu__item-icon"
            v-html="Icon2SVG(suggestion.icon)"
          >
          </span>

          <span>
            <span
              v-for="(match, j) in resolveSuggestMatches2Highlight(
                suggestion.label,
                suggestion.matches
              )"
              :key="j"
              :class="{ 'completion-menu__item-match': match.highlighted }"
            >
              {{ match.text }}
            </span>
          </span>
        </li>
      </ul>
    </n-scrollbar>
  </section>
</template>
<style lang="scss">
// hidden monaco suggest widget
div[widgetid='editor.widget.suggestWidget'].suggest-widget {
  z-index: -999;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
<style scoped lang="scss">
.completion-menu {
  z-index: 999;
  overflow-y: auto;
  position: absolute;
  top: 0;
  right: 0;
  width: 430px;
  height: fit-content;
  padding: 4px;
  color: #808080;
  background-color: #fff;
  border: solid 1px var(--ui-color-grey-700);
  border-radius: 5px;
  box-shadow: var(--ui-box-shadow-small);
}

.completion-menu__item {
  display: flex;
  align-items: center;
  overflow: hidden;
  width: 100%;
  padding: 4px;
  color: black;
  cursor: pointer;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.completion-menu__item:hover {
  background-color: rgba(141, 141, 141, 0.05);
  border-radius: 5px;
}

.completion-menu__item--active {
  padding: 4px;
  color: black;
  background-color: rgba(42, 130, 228, 0.15);
  border-radius: 5px;
}

.completion-menu__item--active:hover {
  background-color: rgba(42, 130, 228, 0.15);
}

.completion-menu__item-icon {
  display: inline-flex;
  margin-right: 4px;
  color: #faa135;
}

.completion-menu__item-match {
  color: var(--ui-color-blue-500);
}
</style>
