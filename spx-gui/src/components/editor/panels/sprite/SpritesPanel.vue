<template>
  <div class="sprites-panel" :style="cssVars">
    <section v-radar="{ name: 'Sprites panel', desc: 'Panel for managing project sprites' }" class="details">
      <PanelHeader :active="selectedSprite != null">
        {{ $t({ en: 'Sprites', zh: '精灵' }) }}
        <template #add-options>
          <UIMenu>
            <UIMenuItem
              v-radar="{ name: 'Add from local file', desc: 'Click to add sprite from local file' }"
              @click="handleAddFromLocalFile"
            >
              {{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}
            </UIMenuItem>
            <UIMenuItem
              v-radar="{ name: 'Add from asset library', desc: 'Click to add sprite from asset library' }"
              @click="handleAddFromAssetLibrary"
            >
              {{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}
            </UIMenuItem>
            <UIMenuItem
              v-radar="{ name: 'Generate sprite', desc: 'Click to generate sprite with AI' }"
              @click="handleGenerate"
            >
              {{ $t({ en: 'Generate with AI', zh: '使用 AI 生成' }) }}
            </UIMenuItem>
          </UIMenu>
        </template>
      </PanelHeader>
      <SpriteList />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AssetType } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile, useGenerateAsset } from '@/components/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UIMenu, UIMenuItem, useUIVariables, getCssVars } from '@/components/ui'
import SpriteList from '@/components/editor/sprite/SpriteList.vue'
import PanelHeader from '../common/PanelHeader.vue'

const uiVariables = useUIVariables()
const cssVars = getCssVars('--panel-color-', uiVariables.color.sprite)

const editorCtx = useEditorCtx()

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

const generateAsset = useGenerateAsset()
const handleGenerate = useMessageHandle(
  async () => {
    const sprite = await generateAsset(editorCtx.project, AssetType.Sprite)
    editorCtx.state.selectSprite(sprite.id)
  },
  {
    en: 'Failed to generate sprite',
    zh: '生成精灵失败'
  }
).fn
</script>

<style scoped lang="scss">
.sprites-panel {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.details {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
