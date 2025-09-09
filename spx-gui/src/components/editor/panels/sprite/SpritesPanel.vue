<template>
  <CommonPanel
    v-radar="{ name: 'Sprites panel', desc: 'Panel for managing project sprites' }"
    :expanded="expanded"
    :active="selectedSprite != null"
    :title="$t({ en: 'Sprites', zh: '精灵' })"
    color="sprite"
    @expand="emit('expand')"
  >
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Add from local file', desc: 'Click to add sprite from local file' }"
          @click="handleAddFromLocalFile"
          >{{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Add from asset library', desc: 'Click to add sprite from asset library' }"
          @click="handleAddFromAssetLibrary"
          >{{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}</UIMenuItem
        >
      </UIMenu>
    </template>
    <template #details>
      <PanelList :sortable="{ list: sprites }" @sorted="handleSorted">
        <UIEmpty v-if="sprites.length === 0" size="medium">
          {{ $t({ en: 'Click + to add sprite', zh: '点击 + 号添加精灵' }) }}
        </UIEmpty>
        <SpriteItem
          v-for="sprite in sprites"
          :key="sprite.id"
          :sprite="sprite"
          :selectable="{ selected: isSelected(sprite) }"
          operable
          droppable
          @click="handleSpriteClick(sprite)"
        />
      </PanelList>
      <!-- <PanelFooter
        v-if="footerExpanded && selectedSprite != null"
        v-radar="{
          name: `Basic configuration for selected sprite`,
          desc: 'Panel for configuring sprite basic settings'
        }"
      >
        <SpriteBasicConfig :sprite="selectedSprite" :project="editorCtx.project" @collapse="footerExpanded = false" />
      </PanelFooter> -->
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

const selectedSprite = computed(() => editorCtx.state.selectedSprite)

function isSelected(sprite: Sprite) {
  return sprite.id === selectedSprite.value?.id
}

function handleSpriteClick(sprite: Sprite) {
  editorCtx.state.selectSprite(sprite.id)
}

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

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update sprite order', zh: '更新精灵顺序' } }
    await editorCtx.project.history.doAction(action, () => editorCtx.project.moveSprite(oldIdx, newIdx))
  },
  {
    en: 'Failed to update sprite order',
    zh: '更新精灵顺序失败'
  }
).fn
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
