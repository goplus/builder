<template>
  <UIEditorBackdropItem
    v-radar="radarNodeMeta"
    :img-src="imgSrc"
    :img-loading="imgLoading"
    :name="backdrop.name"
    :selectable="selectable"
    :color="color"
  >
    <CornerMenu
      v-if="operable && selectable && selectable.selected"
      color="stage"
      :removable="removable"
      :item="backdrop"
      @remove="handleRemove"
    />
  </UIEditorBackdropItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIEditorBackdropItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Backdrop } from '@/models/backdrop'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import CornerMenu from '../../common/CornerMenu.vue'
import { useMessageHandle } from '@/utils/exception'

const props = withDefaults(
  defineProps<{
    backdrop: Backdrop
    color?: 'stage' | 'primary'
    selectable?: false | { selected: boolean }
    /** `operable: true` means the backdrop can be published & removed */
    operable?: boolean
  }>(),
  {
    color: 'stage',
    selectable: false,
    operable: false
  }
)

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)

const radarNodeMeta = computed(() => {
  const name = `Backdrop item "${props.backdrop.name}"`
  const desc = props.selectable ? 'Click to select the backdrop and view more options' : ''
  return { name, desc }
})

const stageRef = computed(() => {
  const stage = props.backdrop.stage
  if (stage == null) throw new Error('stage expected')
  return stage
})
const removable = computed(() => stageRef.value.backdrops.length > 1)

const handleRemove = useMessageHandle(
  async () => {
    const name = props.backdrop.name
    const action = { name: { en: `Remove backdrop ${name}`, zh: `删除背景 ${name}` } }
    await editorCtx.project.history.doAction(action, () => stageRef.value.removeBackdrop(props.backdrop.id))
  },
  {
    en: 'Failed to remove backdrop',
    zh: '删除背景失败'
  }
).fn
</script>
