<template>
  <EditorList
    color="sprite"
    :add-text="$t({ en: 'Add costume', zh: '添加造型' })"
    :sortable="sortable"
    @sorted="handleSorted"
  >
    <CostumeItem
      v-for="costume in sprite.costumes"
      :key="costume.id"
      :costume="costume"
      removable
      :selectable="{ selected: selected?.id === costume.id }"
      @click="handleSelect(costume)"
    />
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="handleAddFromLocalFile">{{
          $t({ en: 'Select local file', zh: '选择本地文件' })
        }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <CostumeDetail v-if="selected != null" :sprite="sprite" :costume="selected" />
    </template>
  </EditorList>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIMenu, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import type { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { useAddCostumeFromLocalFile } from '@/components/asset'
import EditorList from '../common/EditorList.vue'
import CostumeItem from './CostumeItem.vue'
import CostumeDetail from './CostumeDetail.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  sprite: Sprite
}>()

const editorCtx = useEditorCtx()
const sortable = computed(() => editorCtx.userInfo.advancedLibraryEnabled)
const selected = computed(() => props.sprite.defaultCostume)

function handleSelect(costume: Costume) {
  const action = { name: { en: 'Set default costume', zh: '设置默认造型' } }
  editorCtx.project.history.doAction(action, () => props.sprite.setDefaultCostume(costume.id))
}

const addFromLocalFile = useAddCostumeFromLocalFile()
const handleAddFromLocalFile = useMessageHandle(() => addFromLocalFile(props.sprite, editorCtx.project), {
  en: 'Failed to add from local file',
  zh: '从本地文件添加失败'
}).fn

function handleSorted(oldIdx: number, newIdx: number) {
  const action = { name: { en: 'Sort costumes', zh: '调整造型顺序' } }
  editorCtx.project.history.doAction(action, () => props.sprite.moveCostume(oldIdx, newIdx))
}
</script>
