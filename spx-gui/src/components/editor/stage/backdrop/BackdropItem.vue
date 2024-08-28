<template>
  <UIEditorBackdropItem
    :img-src="imgSrc"
    :img-loading="imgLoading"
    :name="backdrop.name"
    :selected="selected"
  >
    <CornerMenu
      :visible="selected"
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
import type { Stage } from '@/models/stage'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import CornerMenu from '../../common/CornerMenu.vue'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  stage: Stage
  backdrop: Backdrop
  selected: boolean
}>()

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)

const removable = computed(() => props.stage.backdrops.length > 1)

const handleRemove = useMessageHandle(
  async () => {
    const name = props.backdrop.name
    const action = { name: { en: `Remove backdrop ${name}`, zh: `删除背景 ${name}` } }
    await editorCtx.project.history.doAction(action, () =>
      props.stage.removeBackdrop(props.backdrop.id)
    )
  },
  {
    en: 'Failed to remove backdrop',
    zh: '删除背景失败'
  }
).fn
</script>
