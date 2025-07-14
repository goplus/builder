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
    <UICornerIcon
      v-if="removable"
      v-radar="{ name: 'Remove', desc: 'Click to remove the animation' }"
      type="trash"
      :color="color"
      @click="handleRemove"
    />
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIImg, UIEditorSpriteItem, useModal, UICornerIcon } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { useHovered } from '@/utils/dom'
import type { Animation } from '@/models/animation'
import { useMessageHandle } from '@/utils/exception'
import CostumesAutoPlayer from '@/components/common/CostumesAutoPlayer.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import AnimationRemoveModal from './AnimationRemoveModal.vue'

const props = withDefaults(
  defineProps<{
    animation: Animation
    color?: 'sprite' | 'primary'
    selectable?: false | { selected: boolean }
    removable?: boolean
    autoplay?: boolean
  }>(),
  {
    color: 'sprite',
    selectable: false,
    removable: false,
    autoplay: false
  }
)

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.animation.costumes[0].img)

const removable = computed(() => props.removable && props.selectable && props.selectable.selected)
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
</script>
