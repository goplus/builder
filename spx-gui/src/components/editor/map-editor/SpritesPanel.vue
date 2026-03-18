<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { SpxProject } from '@/models/spx/project'
import type { Sprite } from '@/models/spx/sprite'
import { AssetType } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'

import { getCssVars, UICard, UIIcon, UIMenu, UIMenuItem, UITooltip, useUIVariables } from '@/components/ui'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile, useGenerateAsset } from '@/components/asset'
import { useEditorCtx } from '../EditorContextProvider.vue'
import SpriteList from '../sprite/SpriteList.vue'
import PanelHeader from '../panels/common/PanelHeader.vue'
import PanelFooter from '../panels/common/PanelFooter.vue'
import SpriteBasicConfig from './SpriteBasicConfig.vue'

const props = defineProps<{
  project: SpxProject
  selectedSprite: Sprite | null
}>()

const emit = defineEmits<{
  'update:selectedSprite': [sprite: Sprite]
}>()

const editorCtx = useEditorCtx()

const footerExpanded = ref(props.selectedSprite != null)
watch(
  () => props.selectedSprite,
  (newSprite) => (footerExpanded.value = newSprite != null)
)

// TODO: CSS variables may not work when the component implementation changes
const uiVariables = useUIVariables()
const cssVars = computed(() => getCssVars('--panel-color-', uiVariables.color.sprite))

function handleSpriteClick(sprite: Sprite) {
  emit('update:selectedSprite', sprite)
}

const addFromLocalFile = useAddSpriteFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const sprite = await addFromLocalFile(props.project)
    handleSpriteClick(sprite)
  },
  {
    en: 'Failed to add sprite from local file',
    zh: '从本地文件添加失败'
  }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()
const handleAddFromAssetLibrary = useMessageHandle(
  async () => {
    const sprites = await addAssetFromLibrary(props.project, AssetType.Sprite)
    handleSpriteClick(sprites[0])
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

<template>
  <UICard
    v-radar="{ name: 'Map Editor\'s Sprite List', desc: 'List of all sprites in the Map Editor' }"
    class="sprite-list-card"
    :style="cssVars"
  >
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
            {{ $t({ en: 'Generate with AI', zh: 'AI 生成' }) }}
          </UIMenuItem>
        </UIMenu>
      </template>
    </PanelHeader>

    <SpriteList class="list-wrapper" />

    <PanelFooter
      v-if="footerExpanded && selectedSprite != null"
      v-radar="{
        name: `Basic configuration for selected sprite`,
        desc: 'Panel for configuring sprite basic settings'
      }"
      class="footer"
    >
      <SpriteBasicConfig :sprite="selectedSprite" :project="project" @collapse="footerExpanded = false" />
    </PanelFooter>

    <UITooltip v-if="!footerExpanded && selectedSprite != null">
      <template #trigger>
        <div
          v-radar="{
            name: 'Expand button',
            desc: 'Button to expand the basic configuration panel for selected sprite'
          }"
          class="footer-expand-button"
          @click="footerExpanded = true"
        >
          <UIIcon class="footer-expand-icon" type="doubleArrowDown" />
        </div>
      </template>
      {{ $t({ en: 'Expand', zh: '展开' }) }}
    </UITooltip>
  </UICard>
</template>

<style lang="scss" scoped>
.sprite-list-card {
  position: relative;
  display: flex;
  flex-direction: column;

  .list-wrapper {
    flex: 1;
  }
}

.footer {
  padding: 16px;
}

.footer-expand-button {
  position: absolute;
  width: 24px;
  height: 24px;
  right: 12px;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0px -2px 8px 0px rgba(51, 51, 51, 0.08);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;
}

.footer-expand-icon {
  transform: rotate(180deg);
}
</style>
