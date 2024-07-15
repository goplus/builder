<template>
  <UISpriteItem
    :img-src="imgSrc"
    :img-loading="imgLoading"
    :name="sprite.name"
    :selected="selected"
  >
    <CornerMenu
      :visible="selected"
      color="sprite"
      removable
      :item="sprite"
      @remove="handelRemove"
    />
  </UISpriteItem>
</template>

<script setup lang="ts">
import { UISpriteItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import CornerMenu from '../../common/CornerMenu.vue'

const props = defineProps<{
  sprite: Sprite
  selected: boolean
}>()

const editorCtx = useEditorCtx()

const [imgSrc, imgLoading] = useFileUrl(() => props.sprite.defaultCostume?.img)

const handelRemove = useMessageHandle(
  async () => {
    const sname = props.sprite.name
    const action = { name: { en: `Remove sprite ${sname}`, zh: `删除精灵 ${sname}` } }
    await editorCtx.project.history.doAction(action, () => editorCtx.project.removeSprite(sname))
  },
  {
    en: 'Failed to remove animation',
    zh: '删除动画失败'
  }
).fn
</script>

<style lang="scss" scoped>
.img {
  width: 60px;
  height: 60px;
}
</style>
