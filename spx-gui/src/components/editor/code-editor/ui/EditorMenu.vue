<script setup lang="ts" generic="T extends EditorMenuItem">
import { icon2SVG, normalizeIconSize } from './common'
import { type CSSProperties, ref } from 'vue'
import { Icon } from '@/components/editor/code-editor/EditorUI'

export interface EditorMenuItem {
  key: string | number
  icon: Icon
  label: string
  iconSize: number
  active?: boolean
}

defineProps<{
  listStyles?: CSSProperties
  items: Array<T>
}>()

defineSlots<{
  default(props: { items: T }): any
}>()

defineEmits<{
  select: [item: T]
  active: [item: T, element: HTMLLIElement]
}>()

const editorMenuElement = ref<HTMLUListElement>()

defineExpose({
  editorMenuElement
})
</script>

<template>
  <section class="editor-menu-container">
    <ul ref="editorMenuElement" class="editor-menu" :style="listStyles">
      <li
        v-for="item in items"
        :key="item.key"
        :ref="(el) => item.active && $emit('active', item, el as HTMLLIElement)"
        class="editor-menu__item"
        :class="{
          'editor-menu__item--active': item.active
        }"
        @mousedown="$emit('select', item)"
      >
        <!-- eslint-disable vue/no-v-html -->
        <span
          :ref="(el) => normalizeIconSize(el as HTMLElement, item.iconSize)"
          class="editor-menu__item-icon"
          v-html="icon2SVG(item.icon)"
        >
        </span>

        <span class="editor-menu__item-label">
          <slot :items="item">{{ item.label }}</slot>
        </span>
      </li>
    </ul>
  </section>
</template>
<style lang="scss">
.editor-menu-container {
  padding: 4px;
  background-color: #fff;
  border: solid 1px var(--ui-color-grey-700);
  border-radius: 5px;
  box-shadow: var(--ui-box-shadow-big);
}

.editor-menu {
  overflow-y: auto;
  color: #808080;
}

.editor-menu__item {
  overflow: hidden;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px;
  color: black;
  cursor: pointer;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-radius: 5px;
}

.editor-menu__item:hover {
  background-color: rgba(141, 141, 141, 0.05);
}

.editor-menu__item--active {
  color: black;
  background-color: rgba(42, 130, 228, 0.15);
}

.editor-menu__item--active:hover {
  background-color: rgba(42, 130, 228, 0.15);
}

.editor-menu__item-icon {
  display: inline-flex;
  margin-right: 4px;
  color: #faa135;
}

.editor-menu__item-label {
  width: 100%;
}
</style>
