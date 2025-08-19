<template>
  <UIEditorSpriteItem
    ref="wrapperRef"
    v-radar="radarNodeMeta"
    :name="sprite.name"
    :selectable="selectable"
    :color="color"
  >
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
    <CornerMenu v-if="operable && selectable && selectable.selected" :color="color">
      <SaveAssetToLibraryMenuItem :item="sprite" />
      <RenameMenuItem v-radar="{ name: 'Rename', desc: 'Click to rename the sprite' }" @click="handleRename" />
      <RemoveMenuItem v-radar="{ name: 'Remove', desc: 'Click to remove the sprite' }" @click="handleRemove" />
    </CornerMenu>
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHovered } from '@/utils/dom'
import { useFileUrl } from '@/utils/file'
import { useMessageHandle } from '@/utils/exception'
import { useDragDroppable } from '@/utils/drag-and-drop'
import { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { Animation } from '@/models/animation'
import { UIImg, UIEditorSpriteItem } from '@/components/ui'
import CostumesAutoPlayer from '@/components/common/CostumesAutoPlayer.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { SaveAssetToLibraryMenuItem, RenameMenuItem, RemoveMenuItem } from '@/components/editor/common/'
import CornerMenu from '../common/CornerMenu.vue'
import { useRenameSprite } from '@/components/asset'

const props = withDefaults(
  defineProps<{
    sprite: Sprite
    color?: 'sprite' | 'primary'
    selectable?: false | { selected: boolean }
    /** `operable: true` means the sprite can be published & removed */
    operable?: boolean
    autoplay?: boolean
    /** If droppable for dragging items like costumes and animations, etc. */
    droppable?: boolean
  }>(),
  {
    color: 'sprite',
    selectable: false,
    operable: false,
    autoplay: false,
    droppable: false
  }
)

const editorCtx = useEditorCtx()

const [imgSrc, imgLoading] = useFileUrl(() => props.sprite.defaultCostume?.img)
const wrapperRef = ref<InstanceType<typeof UIEditorSpriteItem>>()
const hovered = useHovered(() => wrapperRef.value?.$el ?? null)
const animation = computed(() => props.sprite.getDefaultAnimation())

const radarNodeMeta = computed(() => {
  const name = `Sprite item "${props.sprite.name}"`
  const desc = props.selectable ? 'Click to select the sprite and view more options' : ''
  return { name, desc }
})

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

const copyCostume = useMessageHandle(
  async (costume: Costume) => {
    const action = { name: { en: `Copy costume`, zh: `复制造型` } }
    await editorCtx.project.history.doAction(action, async () => {
      const newCostume = costume.clone()
      props.sprite.addCostume(newCostume)
      await props.sprite.autoFitCostumes([newCostume])
      props.sprite.setDefaultCostume(newCostume.id)
    })
  },
  {
    en: 'Failed to copy costume',
    zh: '复制造型失败'
  }
).fn

const renameSprite = useRenameSprite()
const { fn: handleRename } = useMessageHandle(() => renameSprite(props.sprite), {
  en: 'Failed to rename sprite',
  zh: '重命名精灵失败'
})

const copyAnimation = useMessageHandle(
  async (animation: Animation) => {
    const action = { name: { en: `Copy animation`, zh: `复制动画` } }
    await editorCtx.project.history.doAction(action, async () => {
      const newAnimation = animation.clone()
      props.sprite.addAnimation(newAnimation)
      if (animation.sprite != null) {
        const boundStates = animation.sprite.getAnimationBoundStates(animation.id)
        props.sprite.setAnimationBoundStates(newAnimation.id, boundStates, false)
      }
    })
  },
  {
    en: 'Failed to copy animation',
    zh: '复制动画失败'
  }
).fn

useDragDroppable(() => (props.droppable ? wrapperRef.value?.$el : null), {
  // Now styles for `block-item-droppable-accept` & `block-item-droppable-over` are implemented in `UIBlockItem`.
  // While the ideal way to control `UIBlockItem` is passing prop `droppable`, instead of using its internal classes directly.
  // TODO: Update API `useDragDroppable` (& `useDragSortable`) to control props instead of classes.
  acceptClass: 'block-item-droppable-accept',
  overClass: 'block-item-droppable-over',
  accept: (item) => {
    if (item instanceof Costume) return !props.sprite.costumes.includes(item)
    if (item instanceof Animation) return !props.sprite.animations.includes(item)
    return false
  },
  onDrop: async (item) => {
    if (item instanceof Costume) copyCostume(item)
    else if (item instanceof Animation) copyAnimation(item)
  }
})
</script>
