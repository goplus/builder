<template>
  <EditorList color="stage" :add-text="$t({ en: 'Add backdrop', zh: '添加背景' })">
    <TagNode v-for="backdrop in backdrops" :key="backdrop.id" :name="backdrop.name.toLocaleLowerCase()">
      <BackdropItem
        :backdrop="backdrop"
        :selectable="{ selected: selected?.id === backdrop.id }"
        removable
        @click="handleSelect(backdrop)"
      />
    </TagNode>
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="handleAddFromLocalFile">{{
          $t({ en: 'Select local file', zh: '选择本地文件' })
        }}</UIMenuItem>
        <UIMenuItem @click="handleAddFromAssetLibrary">{{
          $t({ en: 'Choose from asset library', zh: '从素材库选择' })
        }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <TagNode name="backdrop-detail">
        <BackdropDetail v-if="selected != null" :backdrop="selected" />
      </TagNode>
    </template>
  </EditorList>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIMenu, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { Backdrop } from '@/models/backdrop'
import { useAddAssetFromLibrary, useAddBackdropFromLocalFile } from '@/components/asset'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import EditorList from '../../common/EditorList.vue'
import BackdropItem from './BackdropItem.vue'
import BackdropDetail from './BackdropDetail.vue'

const editorCtx = useEditorCtx()
const listFilter = editorCtx.listFilter

const stage = computed(() => editorCtx.project.stage)
const selected = computed(() => stage.value.defaultBackdrop)

const backdrops = computed(() => {
  const allBackdrops = editorCtx.project.stage.backdrops
  const { enabled, items } = listFilter.getFilter('backdrop')

  if (enabled && items.length > 0) {
    return allBackdrops.filter((backdrop) => items.includes(backdrop.name))
  }

  return allBackdrops
})

function handleSelect(backdrop: Backdrop) {
  const action = { name: { en: 'Set default backdrop', zh: '设置默认背景' } }
  editorCtx.project.history.doAction(action, () => stage.value.setDefaultBackdrop(backdrop.id))
}

const addBackdropFromLocalFile = useAddBackdropFromLocalFile()

const handleAddFromLocalFile = useMessageHandle(async () => addBackdropFromLocalFile(editorCtx.project), {
  en: 'Failed to add from local file',
  zh: '从本地文件添加失败'
}).fn

const addAssetFromLibrary = useAddAssetFromLibrary()

const handleAddFromAssetLibrary = useMessageHandle(() => addAssetFromLibrary(editorCtx.project, AssetType.Backdrop), {
  en: 'Failed to add from asset library',
  zh: '从素材库添加失败'
}).fn
</script>
