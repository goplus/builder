<template>
  <div class="editor-list" :style="cssVars">
    <div class="sider">
      <ul class="items">
        <slot></slot>
      </ul>
      <UIDropdown trigger="click">
        <template #trigger>
          <!--
            TODO:
            1. dropdown & tooltip should not be both visible: when dropdown visible, hide the tooltip
            2. the empty `div` should be avoided. It is now required due to `Runtime directive used on component with non-element root node. The directives will not function as intended.`
           -->
          <div>
            <UITooltip>
              <template #trigger>
                <button class="add">
                  <UIIcon class="icon" type="plus" />
                </button>
              </template>
              {{ addText }}
            </UITooltip>
          </div>
        </template>
        <slot name="add-options"></slot>
      </UIDropdown>
    </div>
    <slot name="detail"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  UIIcon,
  UIDropdown,
  UITooltip,
  type Color,
  useUIVariables,
  getCssVars
} from '@/components/ui'

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
