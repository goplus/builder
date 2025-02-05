<template>
  <UIEditorSpriteItem :name="sprite.name" :selectable="selectable" :color="color">
    <template #img="{ style }">
      <UIImg :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
    <CornerMenu
      v-if="operable && selectable && selectable.selected"
      :color="color"
      :item="sprite"
      removable
      @remove="handleRemove"
    />
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'
import { UIImg, UIEditorSpriteItem } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import CornerMenu from '../common/CornerMenu.vue'

const props = withDefaults(
  defineProps<{
    sprite: Sprite
    color?: 'sprite' | 'primary'
    selectable?: false | { selected: boolean }
    /** `operable: true` means the sprite can be published & removed */
    operable?: boolean
  }>(),
  {
    color: 'sprite',
    selectable: false,
    operable: false
  }
)

const editorCtx = useEditorCtx()

const [imgSrc, imgLoading] = useFileUrl(() => props.sprite.defaultCostume?.img)

const handleRemove = useMessageHandle(
  async () => {
    const spriteId = props.sprite.id
    const spriteName = props.sprite.name
    const action = { name: { en: `Remove sprite ${spriteName}`, zh: `删除精灵 ${spriteName}` } }
    await editorCtx.project.history.doAction(action, () => editorCtx.project.removeSprite(spriteId))
  },
  {
    en: 'Failed to remove sprite',
    zh: '删除精灵失败'
  }
).fn
</script>
