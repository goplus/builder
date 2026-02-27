<template>
  <EditorList
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
      </UIMenu>
    </template>
    <template #detail>
      <CostumeDetail
        v-if="state.selected != null"
        :sprite="sprite"
        :costume="state.selected"
        @rename="handleRename(state.selected)"
      />
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
    if (costume == null) {
      capture(new Error(`Costume with name "${name}" not found`))
      return
    }
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
import { UIMenu, UIMenuItem } from '@/components/ui'
import { capture, useMessageHandle } from '@/utils/exception'
import { shiftPath, type PathSegments } from '@/utils/route'
import type { Sprite } from '@/models/spx/sprite'
import { Costume } from '@/models/spx/costume'
import { useAddCostumeFromLocalFile, useRenameCostume } from '@/components/asset'
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
  editorCtx.state.history.doAction(action, () => props.sprite.setDefaultCostume(costume.id))
}

const addFromLocalFile = useAddCostumeFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(() => addFromLocalFile(props.sprite), {
  en: 'Failed to add from local file',
  zh: '从本地文件添加失败'
}).fn

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update costume order', zh: '更新造型顺序' } }
    await editorCtx.state.history.doAction(action, () => props.sprite.moveCostume(oldIdx, newIdx))
  },
  {
    en: 'Failed to update costume order',
    zh: '更新造型顺序失败'
  }
).fn

const renameCostume = useRenameCostume()
const handleRename = useMessageHandle(renameCostume, {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
}).fn
</script>
