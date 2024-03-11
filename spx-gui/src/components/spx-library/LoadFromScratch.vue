<template>
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
      @click="uploadSelectedAssetsToPrivateLibrary"
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSoundStore } from 'store/modules/sound'
import { Sound } from '@/class/sound'
import { type MessageApi, NButton, NGrid, NGridItem, NImage, NInput, useMessage } from 'naive-ui'
import { Sprite } from '@/class/sprite'
import { useSpriteStore } from '@/store'
import SoundsImport from '@/assets/image/sounds/sounds-import.svg'
import { commonColor } from '@/assets/theme'
import error from '@/assets/image/library/error.svg'
import { type AssetFileDetail, parseScratchFile } from '@/util/scratch'
import saveAs from 'file-saver'
import { publishAsset, PublishState } from '@/api/asset'
import { AssetType } from '@/constant/constant'

// ----------props & emit------------------------------------

const soundStore = useSoundStore()
const spriteStore = useSpriteStore()
const message: MessageApi = useMessage()

// ----------data related -----------------------------------
// Ref about asset infos.
const assetFileDetails = ref<AssetFileDetail[]>([])
// Ref about an array of selected assets infos.
const selectedAssets = ref<AssetFileDetail[]>([])
// Ref about file upload input component.
const fileUploadInput = ref(null)

// ----------methods-----------------------------------------
/**
 * @description: Return true if asset is an image
 * @param {*} assetDetail
 * @return {*}
 */
const isImage = (assetDetail: AssetFileDetail) => {
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
 * @description: Get the full asset name like "meow.wav"
 * @param {*} asset
 * @return {*}
 */
const getFullAssetName = (asset: AssetFileDetail): string => {
  return asset.name + '.' + asset.extension
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
const chooseAssets = (asset: AssetFileDetail) => {
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
const downloadAsset = (asset: AssetFileDetail) => {
  saveAs(asset.blob, getFullAssetName(asset))
}

/**
 * @description: Import the selected assets to project.
 * @return {*}
 */
const importSelectedAssetsToProject = () => {
  if (!selectedAssets.value) return
  selectedAssets.value.forEach((asset) => {
    let file = getFileFromAssetFileDetail(asset)
    if (isImage(asset)) {
      importSpriteToProject(asset, file)
    } else {
      importSoundToProject(asset, file)
    }
  })
  showImportSuccessMessage()
}

/**
 * @description: Import the selected assets to private asset library.
 * @return {*}
 */
const uploadSelectedAssetsToPrivateLibrary = async () => {
  if (!selectedAssets.value) return
  for (const asset of selectedAssets.value) {
    let assetType = AssetType.Sounds
    if (isImage(asset)) {
      assetType = AssetType.Sprite
    }
    let file = getFileFromAssetFileDetail(asset)
    let uploadFilesArr: File[] = [file]
    await publishAsset(
      asset.name,
      uploadFilesArr,
      assetType,
      PublishState.PrivateLibrary,
      undefined,
      undefined
    );
  }
  showImportSuccessMessage()
}


/**
 * @description: Import sound file to current project
 * @param {*} asset
 * @param {*} file
 * @return {*}
 */
const importSoundToProject = (asset: AssetFileDetail, file: File) => {
  let sound = new Sound(asset.name, [file])
  soundStore.addItem(sound)
}

/**
 * @description: Import sprite file to current project
 * @param {*} asset
 * @param {*} file
 * @return {*}
 */
const importSpriteToProject = (asset: AssetFileDetail, file: File) => {
  let sprite = new Sprite(asset.name, [file])
  spriteStore.addItem(sprite)
}

/**
 * @description: Get file from AssetFileDetail
 * @param {*} asset
 * @return {*}
 */
const getFileFromAssetFileDetail = (asset: AssetFileDetail): File => {
  return new File([asset.blob], getFullAssetName(asset), { type: asset.blob.type })
}

/**
 * @description: Show 'import successfully' message
 * @return {*}
 */
const showImportSuccessMessage = () => {
  message.success('import successfully!', { duration: 1000 })
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
