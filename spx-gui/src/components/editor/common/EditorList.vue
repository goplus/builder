<template>
  <div class="editor-list" :style="cssVars">
    <TagNode name="editor-sider">
      <div class="sider">
        <TagNode name="editor-list-sider-items">
          <ul class="items">
            <slot></slot>
          </ul>
        </TagNode>
        <TagNode name="dropdown-with-tooltip">
          <div>
            <UIDropdownWithTooltip>
              <template #dropdown-content>
                <slot name="add-options"></slot>
              </template>
              <template #tooltip-content>
                {{ addText }}
              </template>
              <template #trigger>
                <button class="add">
                  <UIIcon class="icon" type="plus" />
                </button>
              </template>
            </UIDropdownWithTooltip>
          </div>
        </TagNode>
      </div>
    </TagNode>

    <slot name="detail"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIIcon, type Color, useUIVariables, getCssVars, UIDropdownWithTooltip } from '@/components/ui'

const props = defineProps<{
  color: Color
  addText: string
}>()

const uiVariables = useUIVariables()
const cssVars = computed(() => getCssVars('--editor-list-color-', uiVariables.color[props.color]))
</script>

<style scoped lang="scss">
.editor-list {
  flex: 1 1 0;
  display: flex;
  justify-content: stretch;
}

.sider {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ui-color-dividing-line-2);
}

.items {
  flex: 1 1 0;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add {
  flex: 0 0 auto;
  width: 120px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-bottom-left-radius: var(--ui-border-radius-3);
  cursor: pointer;
  color: var(--ui-color-grey-100);
  background: var(--editor-list-color-main);

  // ensure the button's outline not covered by detail content on the right side
  position: relative;
  z-index: 1;

  &:hover {
    background: var(--editor-list-color-400);
  }
  &:active {
    background: var(--editor-list-color-600);
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}
</style>
