<!--
SpriteList
* list all sprites of the project
* sprite selection / unselection supported
-->

<script setup lang="ts">
import { computed } from 'vue'

import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'

import { UICard, UIMenu, UIMenuItem } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SpriteItem from '@/components/editor/sprite/SpriteItem.vue'
import PanelList from '../panels/common/PanelList.vue'
import PanelHeader from '../panels/common/PanelHeader.vue'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile } from '@/components/asset'
import { AssetType } from '@/apis/asset'

const props = defineProps<{
  project: Project
  selectedSprite: Sprite | null
}>()

const emit = defineEmits<{
  'update:selectedSprite': [sprite: Sprite | null]
}>()

const editorCtx = useEditorCtx()

const sprites = computed(() => props.project.sprites)

function isSelected(sprite: Sprite) {
  return sprite.id === props.selectedSprite?.id
}

function handleSpriteClick(sprite: Sprite) {
  emit('update:selectedSprite', sprite)
}

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update sprite order', zh: '更新精灵顺序' } }
    await editorCtx.project.history.doAction(action, () => editorCtx.project.moveSprite(oldIdx, newIdx))
  },
  {
    en: 'Failed to update sprite order',
    zh: '更新精灵顺序失败'
  }
).fn

const addFromLocalFile = useAddSpriteFromLocalFile()

const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const sprite = await addFromLocalFile(editorCtx.project)
    editorCtx.state.selectSprite(sprite.id)
  },
  {
    en: 'Failed to add sprite from local file',
    zh: '从本地文件添加失败'
  }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()

const handleAddFromAssetLibrary = useMessageHandle(
  async () => {
    const sprites = await addAssetFromLibrary(editorCtx.project, AssetType.Sprite)
    editorCtx.state.selectSprite(sprites[0].id)
  },
  {
    en: 'Failed to add sprite from asset library',
    zh: '从素材库添加失败'
  }
).fn
</script>

<template>
  <UICard
    v-radar="{ name: 'Map Editor\'s Sprite List', desc: 'List of all sprites in the Map Editor' }"
    class="sprite-list-card"
  >
    <PanelHeader class="header" active>
      {{ $t({ en: 'Sprites', zh: '精灵' }) }}
      <template #add-options>
        <UIMenu>
          <UIMenuItem
            v-radar="{ name: 'Add from local file', desc: 'Click to add sprite from local file' }"
            @click="handleAddFromLocalFile"
            >{{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}</UIMenuItem
          >
          <UIMenuItem
            v-radar="{ name: 'Add from asset library', desc: 'Click to add sprite from asset library' }"
            @click="handleAddFromAssetLibrary"
            >{{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}</UIMenuItem
          >
        </UIMenu>
      </template>
    </PanelHeader>

    <PanelList :sortable="{ list: sprites }" @sorted="handleSorted">
      <SpriteItem
        v-for="sprite in sprites"
        :key="sprite.id"
        :sprite="sprite"
        :selectable="{ selected: isSelected(sprite) }"
        operable
        droppable
        @click="handleSpriteClick(sprite)"
      />
    </PanelList>
  </UICard>
</template>

<style lang="scss" scoped>
.sprite-list-card {
  .header {
    --panel-color-main: var(--ui-color-sprite-main);
  }
}
</style>
