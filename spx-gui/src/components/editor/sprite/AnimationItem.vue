<template>
  <EditorItem :selected="selected" color="sprite">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    <EditorItemName class="name">{{ animation.name }}</EditorItemName>
    <UICornerIcon v-show="selected" color="sprite" type="trash" @click.stop="handelRemove" />
  </EditorItem>
</template>

<script setup lang="ts">
import { UIImg, UICornerIcon, useModal } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Sprite } from '@/models/sprite'
import EditorItem from '../common/EditorItem.vue'
import EditorItemName from '../common/EditorItemName.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import type { Animation } from '@/models/animation'
import { useMessageHandle } from '@/utils/exception'
import AnimationRemoveModal from './AnimationRemoveModal.vue'

const props = defineProps<{
  animation: Animation
  sprite: Sprite
  selected: boolean
}>()

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.animation.costumes[0].img)

const removeAnimation = useModal(AnimationRemoveModal)

const handelRemove = useMessageHandle(
  () =>
    removeAnimation({
      animation: props.animation,
      sprite: props.sprite,
      project: editorCtx.project
    }),
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
