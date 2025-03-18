<!--
  Placeholder when no target (sprite/sound/stage) selected
-->

<template>
  <UIEmpty size="extra-large">
    {{ $t({ en: 'Add a sprite to start', zh: '添加一个精灵' }) }}
    <template #op>
      <TagNode name="add-asset-from-local-file">
        <UIButton
          type="boring"
          size="large"
          :loading="handleAddFromLocalFile.isLoading.value"
          @click="handleAddFromLocalFile.fn"
        >
          <template #icon>
            <img :src="localFileImg" />
          </template>
          {{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}
        </UIButton>
      </TagNode>
      <TagNode name="add-asset-from-asset-library">
        <UIButton
          type="boring"
          size="large"
          :loading="handleAddFromAssetLibrary.isLoading.value"
          @click="handleAddFromAssetLibrary.fn"
        >
          <template #icon>
            <img :src="assetLibraryImg" />
          </template>
          {{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}
        </UIButton>
      </TagNode>
    </template>
  </UIEmpty>
</template>

<script setup lang="ts">
import { UIEmpty, UIButton } from '@/components/ui'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import localFileImg from './local-file.svg'
import assetLibraryImg from './asset-library.svg'

const editorCtx = useEditorCtx()

const addFromLocalFile = useAddSpriteFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(() => addFromLocalFile(editorCtx.project), {
  en: 'Failed to add sprite from local file',
  zh: '从本地文件添加失败'
})

const addFromAssetLibrary = useAddAssetFromLibrary()
const handleAddFromAssetLibrary = useMessageHandle(() => addFromAssetLibrary(editorCtx.project, AssetType.Sprite), {
  en: 'Failed to add sprite from asset library',
  zh: '从素材库添加失败'
})
</script>
