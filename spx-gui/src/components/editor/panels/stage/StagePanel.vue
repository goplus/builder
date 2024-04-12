<template>
  <section class="stage-panel">
    <header class="header">
      {{ $t({ en: 'Stage', zh: '舞台' }) }}
    </header>
    <main class="main">
      <NDropdown trigger="hover" :options="options" @select="handleOption">
        <div class="overview" :class="{ active: isSelected }" @click="select">
          <div class="img" :style="imgStyle"></div>
        </div>
      </NDropdown>
    </main>
    <footer>
      <!-- Entry for "add to library", its appearance or position may change later -->
      <NButton v-if="backdrop != null" @click="handleAddToLibrary()">Add to library</NButton>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NDropdown, NButton } from 'naive-ui'
import { useAddAssetFromLibrary, useAddAssetToLibrary } from '@/components/library'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { AssetType } from '@/apis/asset'
import { selectImg, useFileUrl } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { Backdrop } from '@/models/backdrop'
import { stripExt } from '@/utils/path'
import { useEditorCtx } from '../../EditorContextProvider.vue'

const { t } = useI18n()
const editorCtx = useEditorCtx()

const isSelected = computed(() => editorCtx.selected?.type === 'stage')

function select() {
  editorCtx.select('stage')
}

const backdrop = computed(() => editorCtx.project.stage.backdrop)
const imgSrc = useFileUrl(() => backdrop.value?.img)
const imgStyle = computed(() => imgSrc.value && { backgroundImage: `url("${imgSrc.value}")` })

const handleUpload = useMessageHandle(
  async () => {
    const img = await selectImg()
    const file = fromNativeFile(img)
    const backdrop = new Backdrop(stripExt(img.name), file)
    editorCtx.project.stage.setBackdrop(backdrop)
  },
  { en: 'Upload failed', zh: '上传失败' }
)

const addAssetFromLibrary = useAddAssetFromLibrary()

const options = computed(() => {
  return [
    {
      key: 'upload',
      label: t({ en: 'Upload', zh: '上传' }),
      handler: handleUpload
    },
    {
      key: 'fromLibrary',
      label: t({ en: 'Choose from asset library', zh: '从素材库选择' }),
      handler: () => addAssetFromLibrary(editorCtx.project, AssetType.Backdrop)
    }
  ]
})

function handleOption(key: string) {
  for (const option of options.value) {
    if (option.key === key) {
      option.handler()
      return
    }
  }
  throw new Error(`unknown option key: ${key}`)
}

const addToLibrary = useAddAssetToLibrary()

function handleAddToLibrary() {
  addToLibrary(backdrop.value!)
}
</script>

<style scoped lang="scss">
.stage-panel {
}

.header {
  padding: 0.5em 1em;
}

.overview {
  display: flex;
  flex-direction: column;
  width: 80px;
  height: fit-content;
  padding: 6px;
  position: relative;
  align-items: center;
  border: 1px solid #333;

  &.active {
    border-color: yellow;
    background-color: yellow;
  }
}

.img {
  width: 100%;
  height: 68px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}
</style>
