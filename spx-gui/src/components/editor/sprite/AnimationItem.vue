<template>
  <UIEditorSpriteItem
    :selected="selected"
    :img-src="imgSrc"
    :img-loading="imgLoading"
    :name="animation.name"
  >
    <UICornerIcon v-if="selected" type="trash" color="sprite" @click="handelRemove" />
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { UIEditorSpriteItem, useModal, UICornerIcon } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Sprite } from '@/models/sprite'
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
  width: 60px;
  height: 60px;
}
</style>
