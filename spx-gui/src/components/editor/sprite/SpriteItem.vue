<template>
  <UIEditorSpriteItem ref="wrapperRef" :name="sprite.name" :selectable="selectable" :color="color">
    <template #img="{ style }">
      <CostumesAutoPlayer
        v-if="animation != null && (autoplay || hovered)"
        :style="style"
        :costumes="animation.costumes"
        :duration="animation.duration"
        :placeholder-img="imgSrc"
      />
      <UIImg v-else :style="style" :src="imgSrc" :loading="imgLoading" />
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
import { computed, ref } from 'vue'
import { useHovered } from '@/utils/dom'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'
import { UIImg, UIEditorSpriteItem } from '@/components/ui'
import CostumesAutoPlayer from '@/components/common/CostumesAutoPlayer.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import CornerMenu from '../common/CornerMenu.vue'

const props = withDefaults(
  defineProps<{
    sprite: Sprite
    color?: 'sprite' | 'primary'
    selectable?: false | { selected: boolean }
    /** `operable: true` means the sprite can be published & removed */
    operable?: boolean
    autoplay?: boolean
  }>(),
  {
    color: 'sprite',
    selectable: false,
    operable: false,
    autoplay: false
  }
)

const editorCtx = useEditorCtx()

const [imgSrc, imgLoading] = useFileUrl(() => props.sprite.defaultCostume?.img)
const wrapperRef = ref<InstanceType<typeof UIEditorSpriteItem>>()
const hovered = useHovered(() => wrapperRef.value?.$el ?? null)
const animation = computed(() => props.sprite.getDefaultAnimation())

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
