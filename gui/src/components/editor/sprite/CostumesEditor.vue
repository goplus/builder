<template>
  <EditorList
    v-radar="{ name: 'costumes-management', desc: 'Managing costumes of current sprite' }"
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
    <template v-if="state.drafts.length > 0" #drafts>
      <CostumeGenItem
        v-for="draft in state.drafts"
        :key="draft.id"
        :gen="draft.gen"
        :active="state.selectedDraft === draft"
        :is-default="false"
        :operable="{ removable: true }"
        @click="state.select(draft.id)"
        @rename="renameDraft.fn(draft.gen)"
        @remove="editorCtx.state.genState.spriteResources.remove(draft)"
      />
    </template>
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'add-from-local-file', desc: 'Click to add costume from local file' }"
          @click="handleAddFromLocalFile"
          >{{ $t({ en: 'Select local file', zh: '选择本地文件' }) }}</UIMenuItem
        >
        <UIMenuItem v-radar="{ name: 'generate-costume', desc: 'Generate a costume with AI' }" @click="addDraft.fn">{{
          $t({ en: 'Generate with AI', zh: '使用 AI 生成' })
        }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <SpriteResourceGenDetail
        v-if="state.selectedDraft != null"
        :key="state.selectedDraft.id"
        :draft="state.selectedDraft"
      />
      <CostumeDetail
        v-else-if="state.selected != null"
        :sprite="sprite"
        :costume="state.selected"
        @rename="handleRename(state.selected)"
      />
    </template>
  </EditorList>
</template>

<script lang="ts">
export class CostumesEditorState {
  constructor(
    private getSprite: () => Sprite | null,
    private spriteResources: SpriteResourceGens
  ) {}

  get drafts() {
    return this.spriteResources.draftsFor(this.getSprite(), CostumeGen)
  }

  get selectedDraft() {
    return this.drafts.find((d) => d.id === this.draftId.value) ?? null
  }

  private draftId = ref<string | null>(null)

  /** The currently selected costume */
  get selected() {
    return this.selectedDraft == null ? this.getSprite()?.defaultCostume ?? null : null
  }
  /** Select a costume by its ID */
  select(id: string) {
    const draft = this.drafts.find((d) => d.id === id)
    this.draftId.value = draft?.id ?? null
    if (draft == null) this.getSprite()?.setDefaultCostume(id)
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
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { capture, useMessageHandle } from '@/utils/exception'
import { useEnsureSignedIn } from '@/utils/user'
import { Costume } from '@/models/spx/costume'
import { CostumeGen } from '@/models/spx/gen/costume-gen'
import type { Sprite } from '@/models/spx/sprite'
import { useAddCostumeFromLocalFile, useRenameCostume, useRenameCostumeGen } from '@/components/asset'
import CostumeGenItem from '@/components/asset/gen/costume/CostumeGenItem.vue'
import { UIMenu, UIMenuItem } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import EditorList from '../common/EditorList.vue'
import type { SpriteResourceGens } from '../sprite-resource-gens'
import CostumeDetail from './CostumeDetail.vue'
import CostumeItem from './CostumeItem.vue'
import SpriteResourceGenDetail from './SpriteResourceGenDetail.vue'

const props = defineProps<{
  sprite: Sprite
  state: CostumesEditorState
}>()

const editorCtx = useEditorCtx()
const ensureSignedIn = useEnsureSignedIn()
const addDraft = useMessageHandle(
  async () => {
    await ensureSignedIn()
    props.state.select(editorCtx.state.genState.spriteResources.addCostume(props.sprite).id)
  },
  { en: 'Failed to add costume', zh: '添加造型失败' }
)
const renameDraft = useMessageHandle(useRenameCostumeGen(), { en: 'Failed to rename costume', zh: '重命名造型失败' })

function handleSelect(costume: Costume) {
  if (props.sprite.defaultCostume?.id === costume.id) {
    props.state.select(costume.id)
    return
  }
  const action = { name: { en: 'Set default costume', zh: '设置默认造型' } }
  editorCtx.state.history.doAction(action, () => props.state.select(costume.id))
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
