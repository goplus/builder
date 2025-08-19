<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, UIEditorSpriteItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { useMessageHandle } from '@/utils/exception'
import { Sprite } from '@/models/sprite'
import CornerMenu from '../common/CornerMenu.vue'
import { useRenameCostume } from '@/components/asset'
import { RenameMenuItem, RemoveMenuItem, DuplicateMenuItem } from '@/components/editor/common/'

const props = withDefaults(
  defineProps<{
    costume: Costume
    color?: 'sprite' | 'primary'
    selectable?: false | { selected: boolean }
    operable?: boolean
  }>(),
  {
    color: 'sprite',
    selectable: false,
    selected: false,
    operable: false
  }
)

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)

const radarNodeMeta = computed(() => {
  const name = `Costume item "${props.costume.name}"`
  const desc = props.selectable ? 'Click to select the costume and view more options' : ''
  return { name, desc }
})

const parent = computed(() => {
  const parent = props.costume.parent
  if (parent == null) throw new Error('parent expected')
  return parent
})

const removable = computed(() => {
  const costumes = parent.value.costumes
  return costumes.length > 1
})

const { fn: handleDuplicate } = useMessageHandle(
  async () => {
    const costume = props.costume
    const parent = costume.parent
    if (!(parent instanceof Sprite)) {
      throw new Error('Only costumes whose parent is Sprite can be duplicated')
    }
    const action = { name: { en: `Duplicate costume ${costume.name}`, zh: `复制造型 ${costume.name}` } }
    await editorCtx.project.history.doAction(action, async () => {
      const newCostume = costume.clone()
      parent.addCostume(newCostume)
      await parent.autoFitCostumes([newCostume])
      editorCtx.state.selectCostume(parent.id, newCostume.id)
    })
  },
  {
    en: 'Failed to duplicate costume',
    zh: '复制造型失败'
  }
)

const handleRemove = useMessageHandle(
  async () => {
    const name = props.costume.name
    const action = { name: { en: `Remove costume ${name}`, zh: `删除造型 ${name}` } }
    await editorCtx.project.history.doAction(action, () => {
      if (parent.value instanceof Sprite) {
        parent.value.removeCostume(props.costume.id)
        return
      }
      throw new Error('parent expected to be Sprite')
    })
  },
  {
    en: 'Failed to remove costume',
    zh: '删除造型失败'
  }
).fn

const renameCostume = useRenameCostume()
const { fn: handleRename } = useMessageHandle(() => renameCostume(props.costume), {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
})
</script>

<template>
  <UIEditorSpriteItem v-radar="radarNodeMeta" :selectable="selectable" :name="costume.name" :color="color">
    <template #img="{ style }">
      <UIImg :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
    <CornerMenu v-if="operable && selectable && selectable.selected" :color="color">
      <DuplicateMenuItem
        v-radar="{ name: 'Duplicate', desc: 'Click to duplicate the costume' }"
        @click="handleDuplicate"
      />
      <RenameMenuItem v-radar="{ name: 'Rename', desc: 'Click to rename the costume' }" @click="handleRename" />
      <RemoveMenuItem
        v-radar="{ name: 'Remove', desc: 'Click to remove the costume' }"
        :disabled="!removable"
        @click="handleRemove"
      />
    </CornerMenu>
  </UIEditorSpriteItem>
</template>
