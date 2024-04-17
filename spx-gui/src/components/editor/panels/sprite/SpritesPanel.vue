<template>
  <section v-show="props.active" class="sprites-details">
    <PanelHeader :color="uiVariables.color.sprite" :active="editorCtx.selectedSprite != null">
      {{ $t({ en: 'Sprites', zh: '精灵' }) }}
      <template #add-options>
        <UIMenu>
          <UIMenuItem @click="handleUpload">{{ $t({ en: 'Upload', zh: '上传' }) }}</UIMenuItem>
          <UIMenuItem @click="handleChoose">{{ $t({ en: 'Choose', zh: '选择' }) }}</UIMenuItem>
        </UIMenu>
      </template>
    </PanelHeader>
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
    <PanelFooter v-if="editorCtx.selectedSprite != null">
      <SpriteBasicConfig :sprite="editorCtx.selectedSprite" :project="editorCtx.project" />
    </PanelFooter>
  </section>
  <div v-show="!props.active" class="sprites-overview">TODO</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Sprite } from '@/models/sprite'
import { selectImgs } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { Costume } from '@/models/costume'
import { stripExt } from '@/utils/path'
import { useMessageHandle } from '@/utils/exception'
import { useAddAssetFromLibrary } from '@/components/library'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UIMenu, UIMenuItem, useUIVariables } from '@/components/ui'
import SpriteItem from './SpriteItem.vue'
import SpriteBasicConfig from './SpriteBasicConfig.vue'
import PanelHeader from '../common/PanelHeader.vue'
import PanelFooter from '../common/PanelFooter.vue'

const props = defineProps<{
  active: boolean
}>()

const uiVariables = useUIVariables()
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

function handleChoose() {
  addAssetFromLibrary(editorCtx.project, AssetType.Sprite)
}
</script>

<style scoped lang="scss">
.sprites-details, .sprites-overview {
  border-right: 1px solid var(--ui-color-grey-300);
}

.sprites-details {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  padding: 12px var(--ui-gap-middle);
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
}

.sprites-overview {
  width: 60px;
}
</style>
