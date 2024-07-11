<template>
  <UIBlockItem
    :active="active"
    :color="color"
    :variant="color === 'sound' ? 'colorful' : 'standard'"
  >
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
        <UICornerIcon v-show="active" :color="color" type="more" />
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
  </UIBlockItem>
</template>

<script setup lang="ts">
import {
  type Color,
  UIDropdown,
  UICornerIcon,
  UIMenu,
  UIMenuItem,
  UIBlockItem
} from '@/components/ui'
import type { Backdrop } from '@/models/backdrop'
import type { Sprite } from '@/models/sprite'
import type { Sound } from '@/models/sound'
import { useAddAssetToLibrary } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import { Costume } from '@/models/costume'
import { Animation } from '@/models/animation'

const props = defineProps<{
  active: boolean
  color: Color
  item: Backdrop | Sound | Sprite | Costume | Animation
  removable: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()

const addAssetToLibrary = useAddAssetToLibrary()

const handleAddToAssetLibrary = useMessageHandle(
  async () => {
    if (!(props.item instanceof Costume) && !(props.item instanceof Animation)) {
      await addAssetToLibrary(props.item)
    }
    // TODO: What to do with costumes and animations?
  },
  {
    en: 'Failed to add backdrop to asset library',
    zh: '添加素材库失败'
  }
)
</script>

<style lang="scss" scoped>
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
