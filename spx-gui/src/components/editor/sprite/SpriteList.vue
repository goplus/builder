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

    // TODO: should disposal of gen be implemented in `useSpriteGenModal`?
    gen.dispose()
    editorCtx.state.genState.removeSprite(gen.id)

    await editorCtx.state.history.doAction({ name: { en: 'Add sprite', zh: '添加精灵' } }, () =>
      editorCtx.project.addSpriteWithAutoFit(result)
    )
    editorCtx.state.selectSprite(result.id)
  },
  {
    en: 'Failed to add generated sprite',
    zh: '添加生成的精灵失败'
  }
).fn
</script>

<template>
  <div ref="listWrapper" class="sprite-list">
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

<style scoped lang="scss">
.sprite-list {
  flex: 1 0 112px; // 112px: 1 row of sprite items height
  overflow-y: auto;
  margin: 0;
  padding: 12px 0 12px 12px; // no right padding to allow optional scrollbar
  scrollbar-width: thin;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;

  :deep(.sortable-ghost-item) {
    // Shadow-like effect
    // TODO: Use other tools like svg-filter to achieve shadow-like effect, to avoid coupling here with `UIBlockItem`
    border-color: var(--ui-color-grey-400) !important;
    background-color: var(--ui-color-grey-400) !important;
    * {
      visibility: hidden;
    }
  }
}
</style>
