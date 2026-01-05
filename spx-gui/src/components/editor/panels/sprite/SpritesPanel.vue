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
        <SpriteGenItem
          v-for="gen in editorCtx.state.spriteGens"
          :key="gen.id"
          :gen="gen"
          @click="handleSpriteGenClick(gen)"
        />
      </PanelList>
      <PanelFooter
        v-if="footerExpanded && selectedSprite != null"
        v-radar="{
          name: `Basic configuration for selected sprite`,
          desc: 'Panel for configuring sprite basic settings'
        }"
      >
        <SpriteBasicConfig :sprite="selectedSprite" :project="editorCtx.project" @collapse="footerExpanded = false" />
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
import { computed, nextTick, onMounted, ref } from 'vue'
import { AnimationLoopMode, ArtStyle, Perspective, SpriteCategory } from '@/apis/common'
import { AssetType } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'
import { Facing, type CostumeSettings, type SpriteSettings } from '@/apis/aigc'
import { createFileWithWebUrl } from '@/models/common/cloud'
import { CostumeGen } from '@/models/gen/costume-gen'
import { AnimationGen } from '@/models/gen/animation-gen'
import { SpriteGen } from '@/models/gen/sprite-gen'
import { Sprite } from '@/models/sprite'
import { useAddAssetFromLibrary, useAddSpriteFromLocalFile, useSpriteGenModal } from '@/components/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UIMenu, UIMenuItem, UIEmpty, UIIcon, UITooltip } from '@/components/ui'
import SpriteItem from '@/components/editor/sprite/SpriteItem.vue'
import SpriteGenItem from '@/components/asset/gen/sprite/SpriteGenItem.vue'
import CommonPanel from '../common/CommonPanel.vue'
import PanelList from '../common/PanelList.vue'
import PanelSummaryList, { useSummaryList } from '../common/PanelSummaryList.vue'
import PanelFooter from '../common/PanelFooter.vue'
import SpriteSummaryItem from './SpriteSummaryItem.vue'
import SpriteBasicConfig from './config/SpriteBasicConfig.vue'

defineProps<{
  expanded: boolean
}>()

const emit = defineEmits<{
  expand: []
}>()

const editorCtx = useEditorCtx()

const footerExpanded = ref(false)

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

function makeSpriteGenPhaseSettings() {
  const gen = new SpriteGen(editorCtx.project, '负剑忍者')
  gen.setSettings({
    name: 'Ninja',
    category: SpriteCategory.Character,
    artStyle: ArtStyle.PixelArt,
    perspective: Perspective.SideScrolling
  })
  return gen
}

async function makeSpriteGenPhaseContent() {
  const settings: SpriteSettings = {
    name: 'CuteAnimal',
    description: "A cute animal character, suitable for children's games.",
    category: SpriteCategory.Character,
    artStyle: ArtStyle.HandDrawn,
    perspective: Perspective.AngledTopDown
  }
  const gen = new SpriteGen(editorCtx.project, '可爱小动物')
  gen['enrichPhase'].state = {
    status: 'finished',
    result: settings,
    error: null
  }
  gen.setSettings(settings)
  const images = Array.from({ length: 4 })
    .map(() => 'https://builder-usercontent-test.gopluscdn.com/files/Fqb6lL1U54w_UwdBCw7lBg56xnSw-17773')
    .map((url) => createFileWithWebUrl(url, 'todo.svg'))
  gen['genImagesPhase'].state = {
    status: 'finished',
    result: images,
    error: null
  }
  gen.setImage(images[0])
  const costumeSettings: CostumeSettings[] = [
    {
      name: 'costume1',
      description: `Costume 1 for ${settings.name}`,
      facing: Facing.Front,
      artStyle: settings.artStyle,
      perspective: settings.perspective,
      referenceImageUrl: null
    },
    {
      name: 'costume2',
      description: `Another costume for ${settings.name}`,
      facing: Facing.Front,
      artStyle: settings.artStyle,
      perspective: settings.perspective,
      referenceImageUrl: null
    }
  ]
  const animationSettings = [
    {
      name: 'walk',
      description: `A walking animation for ${settings.name}`,
      artStyle: settings.artStyle,
      perspective: settings.perspective,
      loopMode: AnimationLoopMode.Loopable,
      referenceFrameUrl: null
    },
    {
      name: 'jump',
      description: `A jumping animation for ${settings.name}`,
      artStyle: settings.artStyle,
      perspective: settings.perspective,
      loopMode: AnimationLoopMode.NonLoopable,
      referenceFrameUrl: null
    }
  ]
  gen['prepareContentPhase'].state = {
    status: 'finished',
    result: undefined,
    error: null
  }
  gen['makeSprite']()
  const defaultCostumeGen = new CostumeGen(gen, editorCtx.project, gen['getDefaultCostumeSettings']())
  defaultCostumeGen.setImage(images[0])
  await defaultCostumeGen.finish()
  gen.costumes = [defaultCostumeGen, ...costumeSettings.map((cs) => new CostumeGen(gen, editorCtx.project, cs))]
  await nextTick()
  gen.animations = animationSettings.map((as) => new AnimationGen(gen, editorCtx.project, as))
  return gen
}

onMounted(async () => {
  const es = editorCtx.state
  if (es.spriteGens.length > 0) return
  // Add sprite gens for debugging
  // TODO: remove me
  es.addSpriteGen(makeSpriteGenPhaseSettings())
  es.addSpriteGen(await makeSpriteGenPhaseContent())
})

const invokeSpriteGenModal = useSpriteGenModal()

const handleSpriteGenClick = useMessageHandle(
  async (gen: SpriteGen) => {
    const result = await invokeSpriteGenModal(gen)

    // TODO: should disposal of gen be implemented in `useSpriteGenModal`?
    gen.dispose()
    editorCtx.state.removeSpriteGen(gen.id)

    await editorCtx.project.history.doAction({ name: { en: 'Add sprite', zh: '添加精灵' } }, async () => {
      editorCtx.project.addSprite(result)
      await result.autoFit()
    })
    editorCtx.state.selectSprite(result.id)
  },
  {
    en: 'Failed to add generated sprite',
    zh: '添加生成的精灵失败'
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
