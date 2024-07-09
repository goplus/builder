<template>
  <li class="editor-item" :class="{ active: selected }" :style="cssVars">
    <div class="image">
      <slot></slot>
    </div>
    <div class="editor-item-name-container">
      <p class="editor-item-name">
        {{ item.name }}
      </p>
    </div>
    <UIDropdown trigger="click">
      <template #trigger>
        <UICornerIcon v-show="selected" :color="color" type="more" />
      </template>
      <UIMenu>
        <UIMenuItem @click="handleAddToAssetLibrary.fn">{{
          $t({ en: 'Add to asset library', zh: '添加到素材库' })
        }}</UIMenuItem>
        <UIMenuItem :disabled="!removable" @click="emit('remove')">{{
          $t({ en: 'Remove', zh: '删除' })
        }}</UIMenuItem>
      </UIMenu>
    </UIDropdown>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getCssVars,
  useUIVariables,
  type Color,
  UIDropdown,
  UICornerIcon,
  UIMenu,
  UIMenuItem
} from '@/components/ui'
import type { Backdrop } from '@/models/backdrop'
import type { Sprite } from '@/models/sprite'
import type { Sound } from '@/models/sound'
import { useAddAssetToLibrary } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import { Costume } from '@/models/costume'
import { Animation } from '@/models/animation'

const props = defineProps<{
  selected: boolean
  color: Color
  item: Backdrop | Sound | Sprite | Costume | Animation
  removable: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()

const uiVariables = useUIVariables()
const cssVars = computed(() => getCssVars('--editor-item-color-', uiVariables.color[props.color]))

const addAssetToLibrary = useAddAssetToLibrary()

const handleAddToAssetLibrary = useMessageHandle(
  () => {
    if (!(props.item instanceof Costume) && !(props.item instanceof Animation)) {
      return addAssetToLibrary(props.item)
    }
    // TODO: What to do with costumes and animations?
    return Promise.resolve()
  },
  {
    en: 'Failed to add backdrop to asset library',
    zh: '添加素材库失败'
  }
)
</script>

<style lang="scss" scoped>
.editor-item {
  width: 88px;
  height: 88px;
  display: flex;
  flex-direction: column;
  position: relative;
  align-items: center;
  border-radius: var(--ui-border-radius-2);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &:not(.active):hover {
    border-color: var(--ui-color-grey-400);
    background-color: var(--ui-color-grey-400);
  }

  &.active {
    border-color: var(--editor-item-color-main);
    background-color: var(--editor-item-color-200);
  }
}

.image {
  flex: 1;
  display: flex;
  align-items: center;
}

.editor-item-name {
  font-size: 10px;
  line-height: 1.6;
  font-weight: 600;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}

.editor-item-name-container {
  height: 24px;
  padding-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 4px;
}
</style>
