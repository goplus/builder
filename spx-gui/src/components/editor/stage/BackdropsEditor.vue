<template>
  <div class="backdrop-editor">
    <div class="sider">
      <ul class="backdrop-list">
        <BackdropItem
          v-for="backdrop in stage.backdrops"
          :key="backdrop.name"
          :stage="stage"
          :backdrop="backdrop"
          :selected="selected?.name === backdrop.name"
          @click="handleSelect(backdrop)"
        />
      </ul>
      <UIDropdown trigger="click">
        <template #trigger>
          <button class="add">
            <UIIcon class="icon" type="plus" />
          </button>
        </template>
        <UIMenu>
          <UIMenuItem @click="handleAddFromLocalFile">{{
            $t({ en: 'Select local file', zh: '选择本地文件' })
          }}</UIMenuItem>
          <UIMenuItem @click="handleAddFromAssetLibrary">{{
            $t({ en: 'Choose from asset library', zh: '从素材库选择' })
          }}</UIMenuItem>
        </UIMenu>
      </UIDropdown>
    </div>
    <BackdropDetail v-if="selected != null" class="main" :backdrop="selected" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIIcon, UIDropdown, UIMenu, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { selectImg } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { Backdrop } from '@/models/backdrop'
import { stripExt } from '@/utils/path'
import { useAddAssetFromLibrary } from '@/components/asset'
import { AssetType } from '@/apis/asset'
import { useEditorCtx } from '../EditorContextProvider.vue'
import BackdropItem from './BackdropItem.vue'
import BackdropDetail from './BackdropDetail.vue'

const editorCtx = useEditorCtx()
const stage = computed(() => editorCtx.project.stage)
const selected = computed(() => stage.value.defaultBackdrop)

function handleSelect(backdrop: Backdrop) {
  stage.value.setDefaultBackdrop(backdrop.name)
}

const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const img = await selectImg()
    const file = fromNativeFile(img)
    const backdrop = await Backdrop.create(stripExt(img.name), file)
    stage.value.addBackdrop(backdrop)
    stage.value.setDefaultBackdrop(backdrop.name)
  },
  { en: 'Failed to add from local file', zh: '从本地文件添加失败' }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()

const handleAddFromAssetLibrary = useMessageHandle(
  async () => {
    const backdrops = await addAssetFromLibrary(editorCtx.project, AssetType.Backdrop)
    stage.value.setDefaultBackdrop(backdrops[0].name)
  },
  { en: 'Failed to add from asset library', zh: '从素材库添加失败' }
).fn
</script>

<style scoped lang="scss">
.backdrop-editor {
  flex: 1 1 0;
  display: flex;
  justify-content: stretch;
}

.sider {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ui-color-dividing-line-2);
}

.backdrop-list {
  flex: 1 1 0;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add {
  flex: 0 0 auto;
  width: 120px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-grey-100);
  background: var(--ui-color-stage-main);
  border: none;
  border-bottom-left-radius: var(--ui-border-radius-3);
  cursor: pointer;

  .icon {
    width: 16px;
    height: 16px;
  }
}

.main {
  flex: 1 1 0;
}
</style>
