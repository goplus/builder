<template>
  <EditorItem
    :active="selected"
    color="stage"
    :item="backdrop"
    :removable="removable"
    @remove="handelRemove"
  >
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" size="cover" />
  </EditorItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Backdrop } from '@/models/backdrop'
import type { Stage } from '@/models/stage'
import EditorItem from '../common/EditorItem.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  stage: Stage
  backdrop: Backdrop
  selected: boolean
}>()

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)

const removable = computed(() => props.stage.backdrops.length > 1)

function handelRemove() {
  const name = props.backdrop.name
  const action = { name: { en: `Remove backdrop ${name}`, zh: `删除背景 ${name}` } }
  editorCtx.project.history.doAction(action, () => props.stage.removeBackdrop(name))
}
</script>

<style lang="scss" scoped>
.img {
  width: 52px;
  height: 39px;
  border-radius: 4px;
}
</style>
