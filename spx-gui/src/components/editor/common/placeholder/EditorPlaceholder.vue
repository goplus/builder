<!--
  Placeholder when no target (sprite/sound/stage) selected
-->

<template>
  <UIEmpty size="extra-large">
    {{ $t({ en: 'Add a sprite to start', zh: '添加一个精灵' }) }}
    <template #op>
      <UIButton
        v-radar="{ name: 'Add sprite from local file', desc: 'Click to add sprite from local file' }"
        color="boring"
        size="large"
        icon="localFile"
        :loading="handleAddFromLocalFile.isLoading.value"
        @click="handleAddFromLocalFile.fn"
      >
        {{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Add sprite from asset library', desc: 'Click to add sprite from asset library' }"
        color="boring"
        size="large"
        icon="assetLibrary"
        :loading="handleAddFromAssetLibrary.isLoading.value"
        @click="handleAddFromAssetLibrary.fn"
      >
        {{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}
      </UIButton>
    </template>
  </UIEmpty>
</template>

<script setup lang="ts">
import { UIEmpty, UIButton } from '@/components/ui'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '../../EditorContextProvider.vue'

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
