<template>
  <CommonPanel
    v-radar="{ name: 'Sprites panel', desc: 'Panel for managing project sprites' }"
    :expanded="true"
    :active="selectedSprite != null"
    :title="$t({ en: 'Sprites', zh: '精灵' })"
    color="sprite"
  >
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
    <template #details>
      <SpriteList />
    </template>
    <template #summary>
      <PanelSummaryList ref="summaryList" :has-more="summaryListData.hasMore">
        <UIEmpty v-if="sprites.length === 0" size="small">
          {{ $t({ en: 'Empty', zh: '无' }) }}
        </UIEmpty>
        <SpriteSummaryItem v-for="sprite in summaryListData.list" :key="sprite.id" :sprite="sprite" />
      </PanelSummaryList>
    </template>
  </CommonPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AssetType } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile } from '@/components/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UIMenu, UIMenuItem, UIEmpty } from '@/components/ui'
import SpriteList from '@/components/editor/sprite/SpriteList.vue'
import CommonPanel from '../common/CommonPanel.vue'
import PanelSummaryList, { useSummaryList } from '../common/PanelSummaryList.vue'
import SpriteSummaryItem from './SpriteSummaryItem.vue'

const editorCtx = useEditorCtx()

const sprites = computed(() => editorCtx.project.sprites)
const summaryList = ref<InstanceType<typeof PanelSummaryList>>()
const summaryListData = useSummaryList(sprites, () => summaryList.value?.listWrapper ?? null)

const selectedSprite = computed(() => editorCtx.state.selectedSprite)

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

<style scoped lang="scss"></style>
