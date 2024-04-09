<template>
  <n-spin :show="isAssetInfosLoading">
    <div class="file-upload-container">
      <button type="button" class="custom-upload-btn" @click="triggerFileUpload">
        {{ $t('scratch.upload') }}
      </button>
      <input
        ref="fileUploadInput"
        type="file"
        accept=".sb3"
        style="display: none"
        @change="handleScratchFileUpload"
      />
      <button
        v-if="selectedAssets.length != 0"
        class="custom-import-btn"
        @click="importSelectedAssetsToProject"
      >
        {{ $t('scratch.importToSpx') }}
      </button>
      <button
        v-if="selectedAssets.length != 0"
        class="custom-import-btn"
        @click="uploadSelectedAssetsToPersonalLibrary"
      >
        {{ $t('scratch.uploadToPrivateLibrary') }}
      </button>
    </div>
    <div class="asset-detail-info">
      <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
        <n-grid-item
          v-for="assetFileDetail in assetFileDetails"
          :key="assetFileDetail.url"
          class="file-row"
          :style="{
            border: selectedAssets.includes(assetFileDetail)
              ? `3px solid ${commonColor}`
              : '3px solid #eeeeee'
          }"
          @click="chooseAssets(assetFileDetail)"
        >
          <n-input
            v-model:value="assetFileDetail.name"
            placeholder="assetFileDetail.name"
            size="tiny"
            style="width: 80%; margin-top: 2px"
            @click.stop="() => {}"
          >
            <template #suffix>
              .
              <span style="color: #aa9b9b">
                {{ assetFileDetail.extension }}
              </span>
            </template>
          </n-input>
          <n-image
            v-if="isImage(assetFileDetail)"
            style="position: absolute; top: 30px; margin: auto; border-radius: 20px"
            preview-disabled
            width="80"
            height="80"
            :src="assetFileDetail.url"
            :fallback-src="error"
          />
          <n-image
            v-else
            preview-disabled
            style="position: absolute; top: 30px; margin: auto; border-radius: 20px"
            width="80"
            height="80"
            :src="SoundsImport"
            :fallback-src="error"
            @click.stop="playAudio(assetFileDetail.url)"
          />
          <div class="file-btn">
            <n-button
              type="primary"
              secondary
              style="height: 24px; padding: 6px"
              @click.stop="downloadAsset(assetFileDetail)"
            >
              {{ $t('scratch.download') }}
            </n-button>
          </div>
        </n-grid-item>
      </n-grid>
    </div>
  </n-spin>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Sound } from '@/models/sound'
import {
  type MessageApi,
  NButton,
  NGrid,
  NGridItem,
  NImage,
  NInput,
  useMessage,
  NSpin
} from 'naive-ui'
import { Sprite } from '@/models/sprite'
import { useEditorCtx } from '@/components/editor/ProjectEditor.vue'
import { commonColor } from '@/assets/theme'
import error from '@/assets/error.svg'
import { type AssetFileDetail as ScratchAssetFile, parseScratchFile } from '@/utils/scratch'
import saveAs from 'file-saver'
import { addAsset, IsPublic } from '@/apis/asset'
import { useI18n } from 'vue-i18n'
import { Costume } from '@/models/costume'
import { fromBlob } from '@/models/common/file'
import { sound2Asset, sprite2Asset } from '@/models/common/asset'
import SoundsImport from './images/sound-import.svg'

const editorCtx = useEditorCtx()
const message: MessageApi = useMessage()

// ----------data related -----------------------------------
// Ref about asset infos.
const assetFileDetails = ref<ScratchAssetFile[]>([])
// Ref about an array of selected assets infos.
const selectedAssets = ref<ScratchAssetFile[]>([])
// Ref about file upload input component.
const fileUploadInput = ref(null)
// loading state
const isAssetInfosLoading = ref<boolean>(false)
const { t } = useI18n({
  inheritLocale: true
})

// ----------methods-----------------------------------------
/**
 * @description: Return true if asset is an image
 * @param {*} assetDetail
 * @return {*}
 */
const isImage = (assetDetail: ScratchAssetFile) => {
  return ['svg', 'jpeg', 'jpg', 'png'].includes(assetDetail.extension.toLowerCase())
}

/**
 * @description: Trigger File Upload UI.
 * @return {*}
 */
function triggerFileUpload() {
  if (fileUploadInput.value) {
    ;(fileUploadInput.value as HTMLInputElement).click()
  }
}

/**
 * @description: Handle Scratch File Upload. Only.sb3 files are supported
 * @param {*} event
 * @return {*}
 */
const handleScratchFileUpload = async (event: Event) => {
  let input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) {
    return
  }
  assetFileDetails.value = await parseScratchFile(input.files[0])
}

/**
 * @description:Add a method for playing audio directly in the browser
 * @param {*} audioUrl
 * @return {*}
 */
const playAudio = (audioUrl: string) => {
  let audio = new Audio(audioUrl)
  audio.play()
}

/**
 * @description: Choose assets
 * @param {*} asset
 * @return {*}
 */
const chooseAssets = (asset: ScratchAssetFile) => {
  if (selectedAssets.value) {
    let index = selectedAssets.value.findIndex((a) => a.name === asset.name)
    if (index !== -1) {
      selectedAssets.value.splice(index, 1)
    } else {
      selectedAssets.value.push(asset)
    }
  }
}

/**
 * @description: Download one asset file
 * @param {*} asset
 * @return {*}
 */
const downloadAsset = (asset: ScratchAssetFile) => {
  saveAs(asset.blob, asset.name + '.' + asset.extension)
}

/**
 * @description: Import the selected assets to project.
 * @return {*}
 */
const importSelectedAssetsToProject = async () => {
  if (!selectedAssets.value) {
    isAssetInfosLoading.value = false
    return
  }
  await Promise.all(
    selectedAssets.value.map(async (asset) => {
      const spriteOrSound = await scratchAsset2Asset(asset)
      if (spriteOrSound instanceof Sprite) {
        editorCtx.project.addSprite(spriteOrSound)
      } else {
        editorCtx.project.addSound(spriteOrSound)
      }
    })
  )
  showImportSuccessMessage()
}

const uploadSelectedAssetsToPersonalLibrary = async () => {
  isAssetInfosLoading.value = true
  if (!selectedAssets.value) {
    isAssetInfosLoading.value = false
    return
  }
  await Promise.all(
    selectedAssets.value.map(async (asset) => {
      const spriteOrSound = await scratchAsset2Asset(asset)
      const assetData = await (spriteOrSound instanceof Sprite
        ? sprite2Asset(spriteOrSound)
        : sound2Asset(spriteOrSound))
      await addAsset({
        ...assetData,
        displayName: asset.name,
        category: '',
        isPublic: IsPublic.personal,
        preview: 'TODO' // TODO
      })
    })
  )
  showImportSuccessMessage()
}

async function scratchAsset2Asset(scratchFile: ScratchAssetFile) {
  if (isImage(scratchFile)) {
    const costumeName = 'default'
    const costumeFile = await fromBlob(costumeName + '.' + scratchFile.extension, scratchFile.blob)
    const costume = new Costume(costumeName, costumeFile)
    const sprite = new Sprite(scratchFile.name)
    sprite.addCostume(costume)
    return sprite
  } else {
    const soundFile = await fromBlob(
      scratchFile.name + '.' + scratchFile.extension,
      scratchFile.blob
    )
    return new Sound(scratchFile.name, soundFile)
  }
}

/**
 * @description: Show 'import successfully' message
 * @return {*}
 */
const showImportSuccessMessage = () => {
  isAssetInfosLoading.value = false
  message.success(t('message.import'), { duration: 1000 })
}
</script>

<style lang="scss" scoped>
@import '@/assets/theme.scss';

.download-infos {
  text-align: center;
}

.asset-detail-info {
  display: block;
  margin: 5px;
  min-height: 50vh;
  .selected-border {
    border: 3px solid $asset-library-card-title-1;
  }

  .selected-btn {
    background: #a6a6a680;
    color: white;
  }
  .file-row {
    margin: auto;
    margin-top: 10px;
    width: 80%;
    height: 150px;
    border-radius: 20px;
    // border: 3px solid $asset-library-card-title-1;
    border: 3px solid #eeeeee;
    box-shadow: 0 4px 4px 0 #00000026;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: visible;
    cursor: pointer;
    .video-play {
      position: absolute;
      top: 5px;
      right: 5px;
    }
    .file-btn {
      width: 100%;
      height: 100%;
      padding: 10px;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
    }
  }
}

.file-upload-container {
  text-align: center;
  padding: 4px;
  .custom-upload-btn,
  .custom-import-btn {
    font-size: 16px;
    color: rgb(0, 0, 0);
    border-radius: 20px;
    border: 2px solid rgb(0, 20, 41);
    box-shadow: rgb(0, 20, 41) -1px 2px;
    cursor: pointer;
    background-color: rgb(255, 248, 204);
    margin-left: 5px;
    font-family: ChauPhilomeneOne;
  }

  .custom-upload-btn:hover,
  .custom-import-btn:hover {
    background-color: rgb(255, 234, 204);
  }
}
</style>
