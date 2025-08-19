<template>
  <EditorList
    v-radar="{ name: 'Backdrops management', desc: 'Managing backdrops of stage' }"
    color="stage"
    resource-type="backdrop"
    :sortable="{ list: stage.backdrops }"
    @sorted="handleSorted"
  >
    <BackdropItem
      v-for="backdrop in stage.backdrops"
      :key="backdrop.id"
      :backdrop="backdrop"
      :selectable="{ selected: state.selected?.id === backdrop.id }"
      operable
      @click="handleSelect(backdrop)"
    />
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Add from local file', desc: 'Click to add backdrop from local file' }"
          @click="handleAddFromLocalFile"
          >{{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Add from asset library', desc: 'Click to add backdrop from asset library' }"
          @click="handleAddFromAssetLibrary"
          >{{ $t({ en: 'Choose from asset library', zh: '从素材库选择' }) }}</UIMenuItem
        >
      </UIMenu>
    </template>
    <template #detail>
      <BackdropDetail v-if="state.selected != null" :backdrop="state.selected" />
    </template>
  </EditorList>
</template>

<script lang="ts">
export class BackdropsEditorState {
  constructor(private getStage: () => Stage) {}

  /** The currently selected backdrop */
  get selected() {
    return this.getStage().defaultBackdrop
  }
  /** Select a backdrop by its ID */
  select(id: string) {
    this.getStage().setDefaultBackdrop(id)
  }
  /** Select a backdrop by its name */
  selectByName(name: string): void {
    const backdrop = this.getStage().backdrops.find((backdrop) => backdrop.name === name)
    if (backdrop == null) throw new Error(`Backdrop with name "${name}" not found`)
    this.select(backdrop.id)
  }
  /** Select a backdrop (by specifying route path) */
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
import { computed } from 'vue'
import { UIMenu, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { shiftPath, type PathSegments } from '@/utils/route'
import type { Stage } from '@/models/stage'
import { Backdrop } from '@/models/backdrop'
import { useAddAssetFromLibrary, useAddBackdropFromLocalFile } from '@/components/asset'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import EditorList from '../../common/EditorList.vue'
import BackdropItem from './BackdropItem.vue'
import BackdropDetail from './BackdropDetail.vue'

const props = defineProps<{
  state: BackdropsEditorState
}>()

const editorCtx = useEditorCtx()
const stage = computed(() => editorCtx.project.stage)

function handleSelect(backdrop: Backdrop) {
  const action = { name: { en: 'Set default backdrop', zh: '设置默认背景' } }
  editorCtx.project.history.doAction(action, () => stage.value.setDefaultBackdrop(backdrop.id))
}

const addBackdropFromLocalFile = useAddBackdropFromLocalFile()

const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const backdrop = await addBackdropFromLocalFile(editorCtx.project)
    props.state.select(backdrop.id)
  },
  {
    en: 'Failed to add from local file',
    zh: '从本地文件添加失败'
  }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()

const handleAddFromAssetLibrary = useMessageHandle(
  async () => {
    const backdrops = await addAssetFromLibrary(editorCtx.project, AssetType.Backdrop)
    props.state.select(backdrops[0].id)
  },
  {
    en: 'Failed to add from asset library',
    zh: '从素材库添加失败'
  }
).fn

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update backdrop order', zh: '更新背景顺序' } }
    await editorCtx.project.history.doAction(action, () => stage.value.moveBackdrop(oldIdx, newIdx))
  },
  {
    en: 'Failed to update backdrop order',
    zh: '更新背景顺序失败'
  }
).fn
</script>
