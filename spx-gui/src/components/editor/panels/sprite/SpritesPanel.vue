<template>
  <CommonPanel
    :expanded="expanded"
    :active="editorCtx.selectedSprite != null"
    :title="$t({ en: 'Sprites', zh: '精灵' })"
    :color="uiVariables.color.sprite"
    @expand="emit('expand')"
  >
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="handleUpload">{{ $t({ en: 'Upload', zh: '上传' }) }}</UIMenuItem>
        <UIMenuItem @click="handleChoose">{{ $t({ en: 'Choose', zh: '选择' }) }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #details>
      <PanelList>
        <SpriteItem
          v-for="sprite in sprites"
          :key="sprite.name"
          :sprite="sprite"
          :active="isSelected(sprite)"
          @remove="handleSpriteRemove(sprite)"
          @click="handleSpriteClick(sprite)"
        />
      </PanelList>
      <PanelFooter v-if="editorCtx.selectedSprite != null">
        <SpriteBasicConfig :sprite="editorCtx.selectedSprite" :project="editorCtx.project" />
      </PanelFooter>
    </template>
    <template #summary>
      <PanelSummaryList :has-more="spritesForOverviewHasMore">
        <SpriteSummaryItem
          v-for="sprite in spritesForOverview"
          :key="sprite.name"
          :sprite="sprite"
        />
      </PanelSummaryList>
    </template>
  </CommonPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Sprite } from '@/models/sprite'
import { selectImgs } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { Costume } from '@/models/costume'
import { stripExt } from '@/utils/path'
import { useMessageHandle } from '@/utils/exception'
import { useAddAssetFromLibrary } from '@/components/asset'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UIMenu, UIMenuItem, useUIVariables } from '@/components/ui'
import CommonPanel from '../common/CommonPanel.vue'
import PanelList from '../common/PanelList.vue'
import PanelSummaryList from '../common/PanelSummaryList.vue'
import PanelFooter from '../common/PanelFooter.vue'
import SpriteItem from './SpriteItem.vue'
import SpriteSummaryItem from './SpriteSummaryItem.vue'
import SpriteBasicConfig from './SpriteBasicConfig.vue'

defineProps<{
  expanded: boolean
}>()

const emit = defineEmits<{
  expand: []
}>()

const uiVariables = useUIVariables()
const editorCtx = useEditorCtx()

const sprites = computed(() => editorCtx.project.sprites)

const numForPreview = 2 // TODO: it will be ideal to calculate the number (2) with element height
const spritesForOverview = computed(() => sprites.value.slice(0, numForPreview))
const spritesForOverviewHasMore = sprites.value.length > numForPreview

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
    const sprite = Sprite.create(spriteName)
    for (const img of imgs) {
      const file = fromNativeFile(img)
      const costume = Costume.create(stripExt(img.name), file)
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
.overview-sprite-list {
  padding: 12px;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
