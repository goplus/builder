<template>
  <EditorList color="stage" :add-text="$t({ en: 'Add backdrop', zh: '添加背景' })">
    <BackdropItem
      v-for="backdrop in stage.backdrops"
      :key="backdrop.id"
      :stage="stage"
      :backdrop="backdrop"
      :selected="selected?.id === backdrop.id"
      @click="handleSelect(backdrop)"
    />
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
      <BackdropDetail v-if="selected != null" :backdrop="selected" />
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
const stage = computed(() => editorCtx.project.stage)
const selected = computed(() => stage.value.defaultBackdrop)

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
