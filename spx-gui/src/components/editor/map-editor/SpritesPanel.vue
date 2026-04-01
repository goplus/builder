<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { SpxProject } from '@/models/spx/project'
import type { Sprite } from '@/models/spx/sprite'
import { AssetType } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'

import { getCssVars, UICard, UIIcon, UIMenu, UIMenuItem, UITooltip, useUIVariables } from '@/components/ui'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile, useSpriteGenModal } from '@/components/asset'
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

const invokeSpriteGenModal = useSpriteGenModal()
const handleGenerate = useMessageHandle(
  async () => {
    const sprite = await invokeSpriteGenModal(editorCtx.project)
    await editorCtx.state.history.doAction({ name: { en: 'Add sprite', zh: '添加精灵' } }, async () => {
      editorCtx.project.addSprite(sprite)
      await sprite.autoFit()
    })
    handleSpriteClick(sprite)
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
    class="relative flex flex-col"
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
            {{ $t({ en: 'Generate with AI', zh: '使用 AI 生成' }) }}
          </UIMenuItem>
        </UIMenu>
      </template>
    </PanelHeader>

    <SpriteList class="flex-1" />

    <PanelFooter
      v-if="footerExpanded && selectedSprite != null"
      v-radar="{
        name: `Basic configuration for selected sprite`,
        desc: 'Panel for configuring sprite basic settings'
      }"
      class="p-middle"
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
          class="absolute right-3 bottom-0 flex h-6 w-6 cursor-pointer items-center justify-center bg-grey-300 shadow-small"
          @click="footerExpanded = true"
        >
          <UIIcon class="rotate-180" type="doubleArrowDown" />
        </div>
      </template>
      {{ $t({ en: 'Expand', zh: '展开' }) }}
    </UITooltip>
  </UICard>
</template>
