<template>
  <section v-show="props.active" class="sprites-details">
    <UICardHeader>
      <header class="header">
        {{ $t({ en: 'Sprites', zh: '精灵' }) }}
        <NDropdown trigger="hover" :options="addOptions" @select="handleAddOption">
          <span class="add">+</span>
        </NDropdown>
      </header>
    </UICardHeader>
    <ul class="sprite-list">
      <SpriteItem
        v-for="sprite in sprites"
        :key="sprite.name"
        :sprite="sprite"
        :active="isSelected(sprite)"
        @remove="handleSpriteRemove(sprite)"
        @click="handleSpriteClick(sprite)"
      />
    </ul>
    <div v-if="editorCtx.selectedSprite != null" class="sprite-edit">
      <SpriteBasicConfig :sprite="editorCtx.selectedSprite" :project="editorCtx.project" />
    </div>
  </section>
  <div v-show="!props.active" class="sprites-overview">Sprites overview</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NDropdown } from 'naive-ui'
import { Sprite } from '@/models/sprite'
import { useI18n } from '@/utils/i18n'
import { selectImgs } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { Costume } from '@/models/costume'
import { stripExt } from '@/utils/path'
import { useMessageHandle } from '@/utils/exception'
import { useAddAssetFromLibrary } from '@/components/library'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SpriteItem from './SpriteItem.vue'
import SpriteBasicConfig from './SpriteBasicConfig.vue'
import { UICardHeader } from '@/components/ui'

const props = defineProps<{
  active: boolean
}>()

const { t } = useI18n()
const editorCtx = useEditorCtx()

const sprites = computed(() => editorCtx.project.sprites)

function isSelected(sprite: Sprite) {
  return sprite.name === editorCtx.selectedSprite?.name
}

function handleSpriteRemove(sprite: Sprite) {
  editorCtx.project.removeSprite(sprite.name)
}

function handleSpriteClick(sprite: Sprite) {
  editorCtx.select('sprite', sprite.name)
}

const handleUpload = useMessageHandle(
  async () => {
    const imgs = await selectImgs()
    const project = editorCtx.project
    const spriteName = imgs.length === 1 ? stripExt(imgs[0].name) : ''
    const sprite = new Sprite(spriteName)
    for (const img of imgs) {
      const file = fromNativeFile(img)
      const costume = new Costume(stripExt(img.name), file)
      sprite.addCostume(costume)
    }
    project.addSprite(sprite)
  },
  { en: 'Upload failed', zh: '上传失败' }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()

const addOptions = computed(() => {
  return [
    {
      key: 'upload',
      label: t({ en: 'Upload', zh: '上传' }),
      handler: handleUpload
    },
    {
      key: 'fromLibrary',
      label: t({ en: 'Choose from asset library', zh: '从素材库选择' }),
      handler: () => addAssetFromLibrary(editorCtx.project, AssetType.Sprite)
    }
  ]
})

function handleAddOption(key: string) {
  for (const option of addOptions.value) {
    if (option.key === key) {
      option.handler()
      return
    }
  }
  throw new Error(`unknown option key: ${key}`)
}
</script>

<style scoped lang="scss">
.sprites-details {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.add {
  margin-left: 0.5em;
  padding: 0 4px;
  cursor: pointer;
}

.sprite-list {
  flex: 1 1 0;
  overflow-y: auto;
  margin: 0;
  padding: 1em;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 1em;
}

.sprite-edit {
  flex: 0 0 auto;
  padding: 0.5em 1em;
}

.sprites-overview {
  width: 60px;
}
</style>
