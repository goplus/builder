<!--
  Placeholder when no target (sprite/sound/stage) selected
  TODO: extract as UI component when there is another similar case
-->

<template>
  <div class="editor-placeholder">
    <img :src="placeholderImg" />
    <p class="text">{{ $t({ en: 'Add a sprite to start', zh: '添加一个精灵' }) }}</p>
    <div class="op">
      <UIButton
        type="boring"
        size="large"
        :loading="handleAddFromLocalFile.isLoading.value"
        @click="handleAddFromLocalFile.fn"
      >
        <template #icon>
          <img class="icon" :src="localFileImg" />
        </template>
        {{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}
      </UIButton>
      <UIButton
        type="boring"
        size="large"
        :loading="handleAddFromAssetLibrary.isLoading.value"
        @click="handleAddFromAssetLibrary.fn"
      >
        <template #icon>
          <img class="icon" :src="assetLibraryImg" />
        </template>
        {{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}
      </UIButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UIButton } from '@/components/ui'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import placeholderImg from './placeholder.svg'
import localFileImg from './local-file.svg'
import assetLibraryImg from './asset-library.svg'

const editorCtx = useEditorCtx()

const addFromLocalFile = useAddSpriteFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(() => addFromLocalFile(editorCtx.project), {
  en: 'Failed to add sprite from local file',
  zh: '从本地文件添加失败'
})

const addFromAssetLibrary = useAddAssetFromLibrary()
const handleAddFromAssetLibrary = useMessageHandle(
  () => addFromAssetLibrary(editorCtx.project, AssetType.Sprite),
  { en: 'Failed to add sprite from asset library', zh: '从素材库添加失败' }
)
</script>

<style scoped lang="scss">
.editor-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.text {
  margin-top: 4px;
  color: var(--ui-color-grey-700);
  font-size: 16px;
  line-height: 26px;
}

.op {
  margin-top: 32px;
  display: flex;
  gap: var(--ui-gap-large);
}

.icon {
  width: 24px;
  height: 24px;
}
</style>
