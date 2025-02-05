<template>
  <UIEditorSpriteItem :selectable="selectable" :name="animation.name" :color="color">
    <template #img="{ style }">
      <UIImg :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
    <UICornerIcon v-if="removable" type="trash" :color="color" @click="handleRemove" />
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, UIEditorSpriteItem, useModal, UICornerIcon } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { useEditorCtx } from '../EditorContextProvider.vue'
import type { Animation } from '@/models/animation'
import { useMessageHandle } from '@/utils/exception'
import AnimationRemoveModal from './AnimationRemoveModal.vue'

const props = withDefaults(
  defineProps<{
    animation: Animation
    color?: 'sprite' | 'primary'
    selectable?: false | { selected: boolean }
    removable?: boolean
  }>(),
  {
    color: 'sprite',
    selectable: false,
    removable: false
  }
)

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.animation.costumes[0].img)

const removable = computed(() => props.removable && props.selectable && props.selectable.selected)
const removeAnimation = useModal(AnimationRemoveModal)
const handleRemove = useMessageHandle(
  () =>
    removeAnimation({
      animation: props.animation,
      project: editorCtx.project
    }),
  {
    en: 'Failed to remove animation',
    zh: '删除动画失败'
  }
).fn
</script>
