<template>
  <CommonPanel
    :expanded="expanded"
    :active="editorCtx.project.selectedSprite != null"
    :title="$t({ en: 'Sprites', zh: '精灵' })"
    color="sprite"
    @expand="emit('expand')"
  >
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="handleAddFromLocalFile">{{
          $t({ en: 'Select local file', zh: '选择本地文件' })
        }}</UIMenuItem>
        <UIMenuItem @click="handleAddFromAssetLibrary">{{
          $t({ en: 'Choose from asset library', zh: '从素材库选择' })
        }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #details>
      <PanelList>
        <UIEmpty v-if="sprites.length === 0" size="medium">
          {{ $t({ en: 'Click + to add sprite', zh: '点击 + 号添加精灵' }) }}
        </UIEmpty>
        <SpriteItem
          v-for="sprite in sprites"
          :key="sprite.id"
          :sprite="sprite"
          :selectable="{ selected: isSelected(sprite) }"
          operable
          @click="handleSpriteClick(sprite)"
        />
      </PanelList>
      <PanelFooter v-if="footerExpanded && editorCtx.project.selectedSprite != null">
        <SpriteBasicConfig
          :sprite="editorCtx.project.selectedSprite"
          :project="editorCtx.project"
          @collapse="footerExpanded = false"
        />
      </PanelFooter>
      <UITooltip v-if="!footerExpanded && editorCtx.project.selectedSprite != null">
        <template #trigger>
          <div class="footer-expand-button" @click="footerExpanded = true">
            <UIIcon class="footer-expand-icon" type="doubleArrowDown" />
          </div>
        </template>
        {{ $t({ en: 'Expand', zh: '展开' }) }}
      </UITooltip>
    </template>
    <template #summary>
      <PanelSummaryList ref="summaryList" :has-more="summaryListData.hasMore">
        <UIEmpty v-if="sprites.length === 0" size="small">
          {{ $t({ en: 'Empty', zh: '无' }) }}
        </UIEmpty>
        <SpriteSummaryItem v-for="sprite in summaryListData.list" :key="sprite.id" :sprite="sprite" />
      </PanelSummaryList>
    </template>
  </CommonPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Sprite } from '@/models/sprite'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile } from '@/components/asset'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UIMenu, UIMenuItem, UIEmpty, UIIcon, UITooltip } from '@/components/ui'
import SpriteItem from '@/components/editor/sprite/SpriteItem.vue'
import CommonPanel from '../common/CommonPanel.vue'
import PanelList from '../common/PanelList.vue'
import PanelSummaryList, { useSummaryList } from '../common/PanelSummaryList.vue'
import PanelFooter from '../common/PanelFooter.vue'
import SpriteSummaryItem from './SpriteSummaryItem.vue'
import SpriteBasicConfig from './config/SpriteBasicConfig.vue'
import { useMessageHandle } from '@/utils/exception'

defineProps<{
  expanded: boolean
}>()

const emit = defineEmits<{
  expand: []
}>()

const editorCtx = useEditorCtx()

const footerExpanded = ref(true)

const sprites = computed(() => editorCtx.project.sprites)
const summaryList = ref<InstanceType<typeof PanelSummaryList>>()
const summaryListData = useSummaryList(sprites, () => summaryList.value?.listWrapper ?? null)

function isSelected(sprite: Sprite) {
  return sprite.id === editorCtx.project.selectedSprite?.id
}

function handleSpriteClick(sprite: Sprite) {
  editorCtx.project.select({ type: 'sprite', id: sprite.id })
}

const addFromLocalFile = useAddSpriteFromLocalFile()

const handleAddFromLocalFile = useMessageHandle(() => addFromLocalFile(editorCtx.project), {
  en: 'Failed to add sprite from local file',
  zh: '从本地文件添加失败'
}).fn

const addAssetFromLibrary = useAddAssetFromLibrary()

const handleAddFromAssetLibrary = useMessageHandle(() => addAssetFromLibrary(editorCtx.project, AssetType.Sprite), {
  en: 'Failed to add sound from asset library',
  zh: '从素材库添加失败'
}).fn
</script>

<style scoped lang="scss">
.overview-sprite-list {
  padding: 12px;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
