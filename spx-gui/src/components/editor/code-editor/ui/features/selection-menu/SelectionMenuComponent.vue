<script setup lang="ts">
import EditorBulb from '@/components/editor/code-editor/ui/features/selection-menu/EditorBulb.vue'
import EditorMenu from '@/components/editor/code-editor/ui/EditorMenu.vue'
import type { SelectionMenu } from '@/components/editor/code-editor/ui/features/selection-menu/selection-menu'
import { type EditorUI, Icon } from '@/components/editor/code-editor/EditorUI'

const props = defineProps<{
  ui: EditorUI
  selectionMenu: SelectionMenu
}>()
const selectionMenuState = props.selectionMenu.SelectionMenuState
props.selectionMenu.onSelection(({ selection, content }) => {
  const model = props.selectionMenu.editor.getModel()
  if (!model) return
  selectionMenuState.menuVisible = false
  props.ui
    .requestSelectionMenuProviderResolve(model, {
      selection: {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn
      },
      selectContent: content
    })
    .then((menuItems) => {
      props.selectionMenu.SelectionMenuState.menuItems = menuItems.map((item, i) => ({
        ...item,
        key: i,
        icon: Icon.AIAbility,
        // todo: computed from editor font size, or just keep 20
        iconSize: 20
      }))
    })
  const currentCursorPosition = props.selectionMenu.editor.getPosition()
  if (!currentCursorPosition) return

  const scrolledVisiblePosition = props.selectionMenu.editor.getScrolledVisiblePosition({
    lineNumber: currentCursorPosition.lineNumber,
    column: currentCursorPosition.column
  })
  if (!scrolledVisiblePosition) return
  // todo: better position calculate avoid bulb showing in the code area
  selectionMenuState.position.top = scrolledVisiblePosition.top + scrolledVisiblePosition.height
  selectionMenuState.position.left = scrolledVisiblePosition.left
})
</script>

<template>
  <section
    v-show="selectionMenuState.visible"
    :style="{
      top: selectionMenuState.position.top + 'px',
      left: selectionMenuState.position.left + 'px'
    }"
    class="selection-menu"
  >
    <EditorBulb
      :show-border="selectionMenuState.menuVisible"
      @click="selectionMenuState.menuVisible = true"
    ></EditorBulb>
    <EditorMenu
      v-show="selectionMenuState.menuVisible"
      class="selection-menu"
      :items="selectionMenuState.menuItems"
      :only-focus-active="true"
    ></EditorMenu>
  </section>
</template>

<style scoped lang="scss">
.selection-menu {
  position: absolute;
}
</style>
