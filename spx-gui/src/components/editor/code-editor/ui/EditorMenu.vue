<script setup lang="ts" generic="T extends EditorMenuItem">
import { NScrollbar } from 'naive-ui'
import { type Icon, Icon2SVG, normalizeIconSize } from '@/components/editor/code-editor/ui/common'
import { type CSSProperties, ref } from 'vue'

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

const scrollbarRef = ref<InstanceType<typeof NScrollbar>>()
const editorMenuElement = ref<HTMLElement>()

defineExpose({
  scrollbarRef,
  editorMenuElement
})
</script>

<template>
  <section ref="editorMenuElement" class="editor-menu">
    <n-scrollbar ref="scrollbarRef" :style="listStyles">
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
          v-html="Icon2SVG(item.icon)"
        >
        </span>

        <span class="editor-menu__item-label">
          <slot :items="item">{{ item.label }}</slot>
        </span>
      </li>
    </n-scrollbar>
  </section>
</template>
<style lang="scss">
.editor-menu {
  padding: 4px;
  color: #808080;
  background-color: #fff;
  border: solid 1px var(--ui-color-grey-700);
  border-radius: 5px;
  box-shadow: var(--ui-box-shadow-small);
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
