<template>
  <UIEditorSpriteItem
    ref="wrapperRef"
    v-radar="radarNodeMeta"
    :selectable="selectable"
    :name="animation.name"
    :color="color"
  >
    <template #img="{ style }">
      <CostumesAutoPlayer
        v-if="autoplay || hovered"
        :style="style"
        :costumes="animation.costumes"
        :duration="animation.duration"
        :placeholder-img="imgSrc"
      />
      <UIImg v-else :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
    <CornerMenu v-if="operable && selectable && selectable.selected" :color="color">
      <RenameMenuItem v-radar="{ name: 'Rename', desc: 'Click to rename the animation' }" @click="handleRename" />
      <RemoveMenuItem
        v-radar="{ name: 'Remove', desc: 'Click to remove the animation' }"
        :disabled="!removable"
        @click="handleRemove"
      />
    </CornerMenu>
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIImg, UIEditorSpriteItem, useModal } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { useHovered } from '@/utils/dom'
import type { Animation } from '@/models/animation'
import { useMessageHandle } from '@/utils/exception'
import CostumesAutoPlayer from '@/components/common/CostumesAutoPlayer.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import AnimationRemoveModal from './AnimationRemoveModal.vue'
import CornerMenu from '../common/CornerMenu.vue'
import { useRenameAnimation } from '@/components/asset'
import { RenameMenuItem, RemoveMenuItem } from '@/components/editor/common/'

const props = withDefaults(
  defineProps<{
    animation: Animation
    color?: 'sprite' | 'primary'
    selectable?: false | { selected: boolean }
    removable?: boolean
    autoplay?: boolean
    operable?: boolean
  }>(),
  {
    color: 'sprite',
    selectable: false,
    removable: false,
    autoplay: false,
    operable: false
  }
)

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.animation.costumes[0].img)

const wrapperRef = ref<InstanceType<typeof UIEditorSpriteItem>>()
const hovered = useHovered(() => wrapperRef.value?.$el ?? null)

const radarNodeMeta = computed(() => {
  const name = `Animation item "${props.animation.name}"`
  const desc = props.selectable ? 'Click to select the animation and view more options' : ''
  return { name, desc }
})

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

const renameAnimation = useRenameAnimation()
const { fn: handleRename } = useMessageHandle(() => renameAnimation(props.animation), {
  en: 'Failed to rename animation',
  zh: '重命名动画失败'
})
</script>
