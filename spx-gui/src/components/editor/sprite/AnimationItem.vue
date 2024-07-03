<template>
  <EditorItem :selected="selected" color="sprite">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    <EditorItemName class="name">{{ animation.name }}</EditorItemName>
    <UICornerIcon
      v-show="selected && removable"
      color="sprite"
      type="trash"
      @click.stop="handelRemove"
    />
  </EditorItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, UICornerIcon } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Sprite } from '@/models/sprite'
import EditorItem from '../common/EditorItem.vue'
import EditorItemName from '../common/EditorItemName.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import type { Animation } from '@/models/animation'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  animation: Animation
  sprite: Sprite
  selected: boolean
}>()

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.animation.costumes[0].img)

const removable = computed(() => props.sprite.costumes.length > 1)

const handelRemove = useMessageHandle(
  () => {
    const name = props.animation.name
    const action = { name: { en: `Remove animation ${name}`, zh: `删除动画 ${name}` } }
    return editorCtx.project.history.doAction(action, () => props.sprite.removeAnimation(name))
  },
  {
    en: 'Failed to remove animation',
    zh: '删除动画失败'
  }
).fn
</script>

<style lang="scss" scoped>
.img {
  margin: 0 0 2px;
  width: 60px;
  height: 60px;
}
.name {
  padding: 4px 8px 2px;
}
</style>
