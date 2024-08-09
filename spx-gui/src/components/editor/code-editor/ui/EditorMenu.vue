<script setup lang="ts">
import { NVirtualList, type VirtualListInst } from 'naive-ui'
import { type Icon, Icon2SVG, normalizeIconSize } from '@/components/editor/code-editor/common'
import { type CSSProperties, ref } from 'vue'

defineProps<{
  listStyles?: CSSProperties
  items: Array<{
    icon: Icon
    label: string
    iconSize: number
    active?: boolean
  }>
}>()

const emits = defineEmits<{
  select: [idx: any]
}>()

const virtualListRef = ref<VirtualListInst & typeof NVirtualList>()
const $editorMenu = ref<HTMLElement>()

defineExpose({
  virtualListRef,
  $el: $editorMenu
})
</script>

<template>
  <section ref="$editorMenu" class="editor-menu">
    <n-virtual-list
      ref="virtualListRef"
      visible-items-tag="ul"
      :items="items"
      item-resizable
      :item-size="30"
      :style="listStyles"
    >
      <template #default="{ item }">
        <li
          class="editor-menu__item"
          :class="{
            'editor-menu__item--active': item.active
          }"
          @mousedown="emits('select', item)"
        >
          <!-- eslint-disable vue/no-v-html -->
          <span
            :ref="($el) => normalizeIconSize($el as HTMLElement, item.iconSize)"
            class="editor-menu__item-icon"
            v-html="Icon2SVG(item.icon)"
          >
          </span>

          <span class="editor-menu__item-label">
            <slot v-bind="item">{{ item.label }}</slot>
          </span>
        </li>
      </template>
    </n-virtual-list>
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
