<template>
  <EditorItem :active="active" color="sprite" :item="props.sprite" removable @remove="handelRemove">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
  </EditorItem>
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'
import EditorItem from '../../common/EditorItem.vue'
import { useMessageHandle } from '@/utils/exception'
import { useEditorCtx } from '../../EditorContextProvider.vue'

const props = defineProps<{
  sprite: Sprite
  active: boolean
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
