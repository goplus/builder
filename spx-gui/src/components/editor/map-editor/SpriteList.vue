<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'

import { getCssVars, UICard, UIIcon, UIMenu, UIMenuItem, UITooltip, useUIVariables } from '@/components/ui'
import SpriteItem from '@/components/editor/sprite/SpriteItem.vue'
import PanelList from '../panels/common/PanelList.vue'
import PanelHeader from '../panels/common/PanelHeader.vue'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile } from '@/components/asset'
import { AssetType } from '@/apis/asset'
import PanelFooter from '../panels/common/PanelFooter.vue'
import SpriteBasicConfig from './SpriteBasicConfig.vue'

const props = defineProps<{
  project: Project
  selectedSprite: Sprite | null
}>()

const emit = defineEmits<{
  'update:selectedSprite': [sprite: Sprite]
}>()

const sprites = computed(() => props.project.sprites)

const footerExpanded = ref(props.selectedSprite != null)
watch(
  () => props.selectedSprite,
  (newSprite) => (footerExpanded.value = newSprite != null)
)

// TODO: CSS variables may not work when the component implementation changes
const uiVariables = useUIVariables()
const cssVars = computed(() => getCssVars('--panel-color-', uiVariables.color.sprite))

function isSelected(sprite: Sprite) {
  return sprite.id === props.selectedSprite?.id
}

function handleSpriteClick(sprite: Sprite) {
  emit('update:selectedSprite', sprite)
}

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update sprite order', zh: '更新精灵顺序' } }
    await props.project.history.doAction(action, () => props.project.moveSprite(oldIdx, newIdx))
  },
  {
    en: 'Failed to update sprite order',
    zh: '更新精灵顺序失败'
  }
).fn

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
    handleSpriteClick(sprites[0] as Sprite) // TODO: handle sprite generations
  },
  {
    en: 'Failed to add sprite from asset library',
    zh: '从素材库添加失败'
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
            >{{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}</UIMenuItem
          >
          <UIMenuItem
            v-radar="{ name: 'Add from asset library', desc: 'Click to add sprite from asset library' }"
            @click="handleAddFromAssetLibrary"
            >{{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}</UIMenuItem
          >
        </UIMenu>
      </template>
    </PanelHeader>

    <PanelList class="list-wrapper" :sortable="{ list: sprites }" @sorted="handleSorted">
      <SpriteItem
        v-for="sprite in sprites"
        :key="sprite.id"
        :sprite="sprite"
        :selectable="{ selected: isSelected(sprite) }"
        operable
        droppable
        @click.stop="handleSpriteClick(sprite)"
      />
    </PanelList>

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
