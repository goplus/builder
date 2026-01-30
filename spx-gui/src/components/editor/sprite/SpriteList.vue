<script setup lang="ts">
import { type ComponentPublicInstance, computed, onBeforeUnmount, shallowReactive } from 'vue'
import { Sprite } from '@/models/sprite'
import { SpriteGen } from '@/models/gen/sprite-gen'
import { useMessageHandle } from '@/utils/exception'
import { untilNotNull } from '@/utils/utils'
import type { DragSortableOptions } from '@/utils/drag-and-drop'

import { useSpriteGenModal } from '@/components/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import PanelList from '@/components/editor/panels/common/PanelList.vue'
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
  editorCtx.state.addSpriteGenCollapsePosProvider(async (gen) => {
    const el = await untilNotNull(() => spriteGenItemRefs.get(gen.id))
    el.scrollIntoView({ block: 'nearest' })
    const rect = el.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  })
)

const sortableList = computed(() => [...editorCtx.project.sprites, ...editorCtx.state.spriteGens])

const sortableOptions: Pick<DragSortableOptions, 'filterItem' | 'filterMove'> = {
  filterItem: (item: unknown) => {
    return item instanceof SpriteGen
  },
  filterMove: (oldIndex: number, newIndex: number) => {
    const totalList = sortableList.value
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
    await editorCtx.project.history.doAction(action, () => editorCtx.project.moveSprite(oldIdx, newIdx))
  },
  {
    en: 'Failed to update sprite order',
    zh: '更新精灵顺序失败'
  }
).fn

const invokeSpriteGenModal = useSpriteGenModal()

const handleSpriteGenClick = useMessageHandle(
  async (gen: SpriteGen) => {
    const result = await invokeSpriteGenModal(gen)

    // TODO: should disposal of gen be implemented in `useSpriteGenModal`?
    gen.dispose()
    editorCtx.state.removeSpriteGen(gen.id)

    await editorCtx.project.history.doAction({ name: { en: 'Add sprite', zh: '添加精灵' } }, async () => {
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
  <PanelList :sortable="{ list: sortableList, options: sortableOptions }" @sorted="handleSorted">
    <UIEmpty v-if="sprites.length === 0" size="medium">
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
      v-for="gen in editorCtx.state.spriteGens"
      :key="gen.id"
      :ref="(el) => setSpriteGenItemRef(el, gen)"
      :gen="gen"
      @click="handleSpriteGenClick(gen)"
    />
  </PanelList>
</template>

<style scoped lang="scss"></style>
