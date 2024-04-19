<template>
  <section class="stage-panel" :class="{ active }" :style="cssVars">
    <!-- TODO: use UICardHeader? -->
    <h4 class="header">{{ $t({ en: 'Stage', zh: '舞台' }) }}</h4>
    <main class="main">
      <div class="overview" :class="{ active }" @click="activate">
        <div class="img" :style="imgStyle"></div>
        <UIDropdown trigger="click">
          <template #trigger>
            <div v-show="active" class="replace">
              <UIIcon class="icon" type="exchange" />
            </div>
          </template>
          <UIMenu>
            <UIMenuItem @click="handleUpload">{{ $t({ en: 'Upload', zh: '上传' }) }}</UIMenuItem>
            <UIMenuItem @click="handleChoose">{{ $t({ en: 'Choose', zh: '选择' }) }}</UIMenuItem>
          </UIMenu>
        </UIDropdown>
      </div>
      <footer v-if="isLibraryEnabled() && backdrop != null">
        <UIButton @click="handleAddToLibrary()">Add</UIButton>
      </footer>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAddAssetFromLibrary, useAddAssetToLibrary } from '@/components/library'
import { UIButton, UIDropdown, UIIcon, UIMenu, UIMenuItem, getCssVars, useUIVariables } from '@/components/ui'
import { isLibraryEnabled } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { AssetType } from '@/apis/asset'
import { selectImg, useFileUrl } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { Backdrop } from '@/models/backdrop'
import { stripExt } from '@/utils/path'
import { useEditorCtx } from '../../EditorContextProvider.vue'

const editorCtx = useEditorCtx()

const active = computed(() => editorCtx.selected?.type === 'stage')

function activate() {
  editorCtx.select('stage')
}

const backdrop = computed(() => editorCtx.project.stage.backdrop)
const imgSrc = useFileUrl(() => backdrop.value?.img)
const imgStyle = computed(() => imgSrc.value && { backgroundImage: `url("${imgSrc.value}")` })

const handleUpload = useMessageHandle(
  async () => {
    const img = await selectImg()
    const file = fromNativeFile(img)
    const backdrop = Backdrop.create(stripExt(img.name), file)
    editorCtx.project.stage.setBackdrop(backdrop)
  },
  { en: 'Upload failed', zh: '上传失败' }
).fn

const addAssetFromLibrary = useAddAssetFromLibrary()

function handleChoose() {
  addAssetFromLibrary(editorCtx.project, AssetType.Backdrop)
}

const addToLibrary = useAddAssetToLibrary()

function handleAddToLibrary() {
  addToLibrary(backdrop.value!)
}

const uiVariables = useUIVariables()
const cssVars = getCssVars('--panel-color-', uiVariables.color.stage)
</script>

<style scoped lang="scss">
.header {
  height: 44px;
  width: 80px;
  display: flex;
  justify-content: center;
  align-items: center;

  font-size: 16px;
  color: var(--ui-color-title);
  border-bottom: 1px solid var(--ui-color-grey-400);
}

.stage-panel.active {
  .header {
    color: var(--ui-color-grey-100);
    background-color: var(--ui-color-stage-main);
    border-color: var(--ui-color-stage-main);
  }
}

.main {
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.overview {
  width: 100%;
  padding: 4px;
  position: relative;
  border-radius: var(--ui-border-radius-1);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &:not(.active):hover {
    background-color: var(--ui-color-grey-400);
  }

  &.active {
    padding: 2px;
    background-color: var(--ui-color-grey-400);
    border: 2px solid var(--ui-color-stage-main);
  }
}

.img {
  width: 100%;
  padding-bottom: 80%;
  border-radius: 4px;
  background-position: center;
  background-size: cover;
}

.replace {
  position: absolute;
  top: -6px;
  right: -6px;

  display: flex;
  width: 24px;
  height: 24px;
  justify-content: center;
  align-items: center;

  color: var(--ui-color-grey-100);
  border-radius: 24px;
  background: var(--panel-color-main);
  cursor: pointer;

  &:hover {
    background-color: var(--panel-color-400);
  }
  &:active {
    background-color: var(--panel-color-600);
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}
</style>
