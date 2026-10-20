<script setup lang="ts">
import { type ComponentPublicInstance, computed, onBeforeUnmount, ref, shallowReactive } from 'vue'
import { Sprite } from '@/models/spx/sprite'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { useMessageHandle } from '@/utils/exception'
import { untilNotNull } from '@/utils/utils'
import { type DragSortableOptions, useDragSortable } from '@/utils/drag-and-drop'

import { useSpriteGenModal } from '@/components/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SpriteGenItem from '@/components/asset/gen/sprite/SpriteGenItem.vue'
import SpriteItem from '@/components/editor/sprite/SpriteItem.vue'
import { UIEmpty } from '@/components/ui'

const props = withDefaults(defineProps<{ layout?: 'wrap' | 'vertical' }>(), { layout: 'wrap' })

const editorCtx = useEditorCtx()
const sprites = computed(() => editorCtx.project.sprites)
const selectedSprite = computed(() => editorCtx.state.selectedSprite)

function isSelected(sprite: Sprite) {
  return sprite.id === selectedSprite.value?.id
}

function handleSpriteClick(sprite: Sprite) {
  editorCtx.state.selectSprite(sprite.id)
}

const spriteGenItemRefs = shallowReactive(new Map<string, HTMLElement>())
function setSpriteGenItemRef(ref: Element | ComponentPublicInstance | null, gen: SpriteGen) {
  if (ref != null && '$el' in ref && ref.$el instanceof HTMLElement) spriteGenItemRefs.set(gen.id, ref.$el)
  else spriteGenItemRefs.delete(gen.id)
}

onBeforeUnmount(
  editorCtx.state.genState.registerSpritePosProvider(async (gen) => {
    const el = await untilNotNull(() => spriteGenItemRefs.get(gen.id))
    el.scrollIntoView({ block: 'nearest' })
    const rect = el.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  })
)

const list = computed(() => [...editorCtx.project.sprites, ...editorCtx.state.genState.sprites])
const listWrapper = ref<HTMLElement | null>(null)

const sortableOptions: Pick<DragSortableOptions, 'filterItem' | 'filterMove'> = {
  filterItem: (item: unknown) => {
    return item instanceof SpriteGen
  },
  filterMove: (oldIndex: number, newIndex: number) => {
    const totalList = list.value
    // spriteGens cannot be moved
    const fromItem = totalList[oldIndex]
    if (fromItem instanceof SpriteGen) return true
    // sprites can only be moved to positions before spriteGens, i.e., cannot be moved to positions of spriteGens or after
    const toItem = totalList[newIndex]
    if (toItem instanceof SpriteGen) return true
    return false
  }
}

const handleSorted = useMessageHandle(
  // sprites are always before spriteGens, so the index is correct theoretically
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update sprite order', zh: '更新精灵顺序' } }
    await editorCtx.state.history.doAction(action, () => editorCtx.project.moveSprite(oldIdx, newIdx))
  },
  {
    en: 'Failed to update sprite order',
    zh: '更新精灵顺序失败'
  }
).fn

useDragSortable(list, listWrapper, {
  ghostClass: 'sortable-ghost-item',
  onSorted(oldIdx, newIdx) {
    handleSorted(oldIdx, newIdx)
  },
  ...sortableOptions
})

const invokeSpriteGenModal = useSpriteGenModal()

const handleSpriteGenClick = useMessageHandle(
  async (gen: SpriteGen) => {
    const result = await invokeSpriteGenModal(editorCtx.project, gen)

    await editorCtx.state.history.doAction({ name: { en: 'Add sprite', zh: '添加精灵' } }, async () => {
      editorCtx.project.addSprite(result)
      await result.autoFit()
    })
    editorCtx.state.selectSprite(result.id)
  },
  {
    en: 'Failed to add generated sprite',
    zh: '添加生成的精灵失败'
  }
).fn
</script>

<template>
  <div
    ref="listWrapper"
    class="sprite-list overflow-y-auto m-0 gap-2"
    :class="
      props.layout === 'vertical' ? 'sprite-list-vertical flex flex-wrap content-start' : 'flex flex-wrap content-start'
    "
  >
    <UIEmpty v-if="list.length === 0" size="medium">
      {{ $t({ en: 'Click + to add sprite', zh: '点击 + 号添加精灵' }) }}
    </UIEmpty>
    <SpriteItem
      v-for="sprite in sprites"
      :key="sprite.id"
      :sprite="sprite"
      :selectable="{ selected: isSelected(sprite) }"
      operable
      droppable
      @click="handleSpriteClick(sprite)"
    />
    <SpriteGenItem
      v-for="gen in editorCtx.state.genState.sprites"
      :key="gen.id"
      :ref="(el) => setSpriteGenItemRef(el, gen)"
      :gen="gen"
      @click="handleSpriteGenClick(gen)"
    />
  </div>
</template>

<style scoped>
.sprite-list {
  flex: 1 0 96px; /* 96px: 1 row of sprite items height */
  column-gap: 6px;
  --editor-card-corner-inset: 2px;
  --editor-card-corner-icon-size: 14px;
  --editor-sprite-thumbnail-size: 40px;
  --editor-sprite-thumbnail-margin-top: 2px;
  --editor-sprite-thumbnail-margin-bottom: 4px;
  padding: 12px 8px;
  scrollbar-width: thin;
}

.sprite-list :deep(> .ui-block-item) {
  width: 72px;
  height: 72px;
}

.sprite-list :deep(> .ui-block-item-active) {
  z-index: 1;
}

.sprite-list-vertical {
  flex: 1 1 0;
  scrollbar-gutter: stable;
}

/* Shadow-like effect */
/* TODO: Use other tools like svg-filter to achieve shadow-like effect, to avoid coupling here with `UIBlockItem` */
:deep(.sortable-ghost-item) {
  border-color: var(--ui-color-grey-400) !important;
  background-color: var(--ui-color-grey-400) !important;
}
:deep(.sortable-ghost-item *) {
  visibility: hidden;
}
</style>
