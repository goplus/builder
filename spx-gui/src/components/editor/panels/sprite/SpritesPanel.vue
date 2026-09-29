<template>
  <div class="h-full w-full overflow-hidden">
    <section
      v-radar="{ name: 'Sprites and stage panel', desc: 'Panel for managing project sprites and the stage' }"
      class="h-full flex flex-col overflow-hidden"
    >
      <PanelHeader
        v-if="!props.embedded"
        class="flex-none"
        :active="selectedSprite != null"
        :height="props.headerHeight"
      >
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
      <main class="min-h-0 flex flex-[1_1_0] overflow-hidden">
        <SpriteList :layout="props.layout" @select="emit('select')">
          <template v-if="props.embedded" #add>
            <UIDropdown trigger="click" placement="bottom-end" :offset="{ x: 0, y: 8 }">
              <template #trigger>
                <UIBlockItem
                  v-radar="{ name: 'Add sprite', desc: 'Click to view options for adding a sprite' }"
                  class="text-grey-800"
                >
                  <div class="mb-0.5 size-15 flex items-center justify-center">
                    <UIIcon class="size-6" type="plus" />
                  </div>
                  <UIBlockItemTitle size="medium" :title="$t({ en: 'Add', zh: '添加' })">
                    {{ $t({ en: 'Add', zh: '添加' }) }}
                  </UIBlockItemTitle>
                </UIBlockItem>
              </template>
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
            </UIDropdown>
          </template>
        </SpriteList>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AssetType } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile, useSpriteGenModal } from '@/components/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UIBlockItem, UIBlockItemTitle, UIDropdown, UIIcon, UIMenu, UIMenuItem } from '@/components/ui'
import type { Sprite } from '@/models/spx/sprite'
import SpriteList from '@/components/editor/sprite/SpriteList.vue'
import PanelHeader from '../common/PanelHeader.vue'

const editorCtx = useEditorCtx()
const props = withDefaults(
  defineProps<{
    layout?: 'wrap' | 'vertical'
    headerHeight?: 'default' | 'large'
    embedded?: boolean
  }>(),
  { layout: 'wrap', headerHeight: 'default', embedded: false }
)
const emit = defineEmits<{ select: [] }>()

const selectedSprite = computed(() => editorCtx.state.selectedSprite)

const addFromLocalFile = useAddSpriteFromLocalFile()

const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const sprite = await addFromLocalFile(editorCtx.project)
    editorCtx.state.selectSprite(sprite.id)
    emit('select')
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
    emit('select')
  },
  {
    en: 'Failed to add sprite from asset library',
    zh: '从素材库添加失败'
  }
).fn

const invokeSpriteGenModal = useSpriteGenModal()
const handleGenerate = useMessageHandle(
  async () => {
    const sprite: Sprite = await invokeSpriteGenModal(editorCtx.project)
    await editorCtx.state.history.doAction({ name: { en: 'Add sprite', zh: '添加精灵' } }, async () => {
      editorCtx.project.addSprite(sprite)
      await sprite.autoFit()
    })
    editorCtx.state.selectSprite(sprite.id)
    emit('select')
  },
  {
    en: 'Failed to generate sprite',
    zh: '生成精灵失败'
  }
).fn
</script>
