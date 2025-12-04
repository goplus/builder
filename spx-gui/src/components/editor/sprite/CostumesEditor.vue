<template>
  <UIEmpty v-if="sprite.costumes.length === 0" size="extra-large">
    {{ $t({ en: 'No costumes', zh: '没有造型' }) }}
    <!-- <template #op>
      <UIButton
        v-radar="{ name: 'Generate costume button', desc: 'Click to generate costume with AI' }"
        type="boring"
        size="large"
        @click="handleGenerateCostume"
      >
        <template #icon>
          <img :src="galleryIcon" />
        </template>
        {{ $t({ en: 'Generate costume', zh: '生成造型' }) }}
      </UIButton>
    </template> -->
  </UIEmpty>
  <EditorList
    v-else
    v-radar="{ name: 'Costumes management', desc: 'Managing costumes of current sprite' }"
    color="sprite"
    resource-type="costume"
    :sortable="{ list: sprite.costumes }"
    @sorted="handleSorted"
  >
    <CostumeItem
      v-for="costume in sprite.costumes"
      :key="costume.id"
      :costume="costume"
      operable
      :selectable="{ selected: state.selected?.id === costume.id }"
      @click="handleSelect(costume)"
    />
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Add from local file', desc: 'Click to add costume from local file' }"
          @click="handleAddFromLocalFile"
          >{{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}</UIMenuItem
        >
        <!-- <UIMenuItem
          v-radar="{ name: 'Generate costume option', desc: 'Click to generate costume with AI' }"
          @click="handleGenerateCostume"
          >{{ $t({ en: 'Generate costume', zh: '生成造型' }) }}</UIMenuItem
        > -->
      </UIMenu>
    </template>
    <template #detail>
      <CostumeDetail v-if="state.selected != null" :sprite="sprite" :costume="state.selected" />
    </template>
  </EditorList>
</template>

<script lang="ts">
export class CostumesEditorState {
  constructor(private getSprite: () => Sprite | null) {}

  /** The currently selected costume */
  get selected() {
    return this.getSprite()?.defaultCostume ?? null
  }
  /** Select a costume by its ID */
  select(id: string) {
    this.getSprite()?.setDefaultCostume(id)
  }
  /** Select a costume by its name */
  selectByName(name: string): void {
    const costume = this.getSprite()?.costumes.find((costume) => costume.name === name)
    if (costume == null) throw new Error(`Costume with name "${name}" not found`)
    this.select(costume.id)
  }
  /** Select a costume (by specifying route path) */
  selectByRoute(path: PathSegments) {
    const [name] = shiftPath(path)
    if (name == null) return
    return this.selectByName(name)
  }
  /** Get route path for the current selection */
  getRoute(): PathSegments {
    if (this.selected == null) return []
    return [this.selected.name]
  }
}
</script>

<script setup lang="ts">
import { UIMenu, UIMenuItem, UIEmpty } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { shiftPath, type PathSegments } from '@/utils/route'
import type { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { useAddCostumeFromLocalFile } from '@/components/asset'
import EditorList from '../common/EditorList.vue'
import CostumeItem from './CostumeItem.vue'
import CostumeDetail from './CostumeDetail.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  sprite: Sprite
  state: CostumesEditorState
}>()

const editorCtx = useEditorCtx()

function handleSelect(costume: Costume) {
  const action = { name: { en: 'Set default costume', zh: '设置默认造型' } }
  editorCtx.project.history.doAction(action, () => props.sprite.setDefaultCostume(costume.id))
}

const addFromLocalFile = useAddCostumeFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(() => addFromLocalFile(props.sprite, editorCtx.project), {
  en: 'Failed to add from local file',
  zh: '从本地文件添加失败'
}).fn

// const generateCostume = useCostumeGeneratorModal()
// const handleGenerateCostume = useMessageHandle(
//   async () => {
//     const settings: AssetSettings = {
//       ...editorCtx.project.settings,
//       projectDescription: editorCtx.project.description ?? editorCtx.project.aiDescription ?? null,
//       description: null,
//       category: 'other'
//     }
//     const costume = await generateCostume(props.sprite, settings)
//     props.state.select(costume.id)
//   },
//   {
//     en: 'Failed to generate costume',
//     zh: '生成造型失败'
//   }
// ).fn

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update costume order', zh: '更新造型顺序' } }
    await editorCtx.project.history.doAction(action, () => props.sprite.moveCostume(oldIdx, newIdx))
  },
  {
    en: 'Failed to update costume order',
    zh: '更新造型顺序失败'
  }
).fn
</script>
