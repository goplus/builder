<template>
  <UIDropdown trigger="click">
    <template #trigger>
      <UICornerIcon v-show="visible" :color="color" type="more" />
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
</template>
<script setup lang="ts">
import { useAddAssetToLibrary } from '@/components/asset'
import { UIDropdown, UICornerIcon, UIMenu, UIMenuItem, type Color } from '@/components/ui'
import type { Backdrop } from '@/models/backdrop'
import type { Sound } from '@/models/sound'
import type { Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  item: Backdrop | Sound | Sprite
  removable: boolean
  color: Color
  visible: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()

const addAssetToLibrary = useAddAssetToLibrary()

const handleAddToAssetLibrary = useMessageHandle(
  async () => {
    await addAssetToLibrary(props.item)
  },
  {
    en: 'Failed to add to asset library',
    zh: '添加至素材库失败'
  }
)
</script>
