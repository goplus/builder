<template>
  <EditorItem :selected="selected" color="stage">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" size="cover" />
    <EditorItemName class="name">{{ backdrop.name }}</EditorItemName>
    <UIDropdown trigger="click">
      <template #trigger>
        <UICornerIcon v-show="selected" color="stage" type="more" />
      </template>
      <UIMenu>
        <UIMenuItem @click="handleAddToAssetLibrary.fn">{{
          $t({ en: 'Add to asset library', zh: '添加到素材库' })
        }}</UIMenuItem>
        <UIMenuItem :disabled="!removable" @click="handelRemove">{{
          $t({ en: 'Remove', zh: '删除' })
        }}</UIMenuItem>
      </UIMenu>
    </UIDropdown>
  </EditorItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, UICornerIcon, UIDropdown, UIMenu, UIMenuItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Backdrop } from '@/models/backdrop'
import { useAddAssetToLibrary } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import type { Stage } from '@/models/stage'
import EditorItem from '../common/EditorItem.vue'
import EditorItemName from '../common/EditorItemName.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  stage: Stage
  backdrop: Backdrop
  selected: boolean
}>()

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)

const addAssetToLibrary = useAddAssetToLibrary()

const handleAddToAssetLibrary = useMessageHandle(() => addAssetToLibrary(props.backdrop), {
  en: 'Failed to add backdrop to asset library',
  zh: '添加素材库失败'
})

const removable = computed(() => props.stage.backdrops.length > 1)

function handelRemove() {
  const name = props.backdrop.name
  const action = { name: { en: `Remove backdrop ${name}`, zh: `删除背景 ${name}` } }
  editorCtx.project.history.doAction(action, () => props.stage.removeBackdrop(name))
}
</script>

<style lang="scss" scoped>
.img {
  margin: 12px 0 14px;
  width: 52px;
  height: 39px;
  border-radius: 4px;
}
.name {
  padding: 3px 8px 3px;
}
</style>
