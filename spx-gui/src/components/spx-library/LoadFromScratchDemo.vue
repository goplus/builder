<template>
  <div class="file-upload-container">
    <button type="button" class="custom-upload-btn" @click="triggerFileUpload">
      Upload .sb3 File
    </button>
    <input
      ref="fileUploadInput"
      type="file"
      accept=".sb3"
      style="display: none"
      @change="handleScratchFileUpload"
    />
    <button v-if="selectedAssets.length != 0" class="custom-import-btn" @click="importSelectedAssetToProject">Import to spx project</button>
  </div>
  <div class="asset-detail-info">
    <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
      <n-grid-item v-for="assetFileDetail in assetFileDetails" :key="assetFileDetail.url" class="file-row" @click="chooseAsset(assetFileDetail)" :style="{border: selectedAssets.includes(assetFileDetail) ? `3px solid ${commonColor}` : '3px solid #eeeeee'}">
        <n-input
          v-model:value="assetFileDetail.name"
          placeholder="assetFileDetail.name"
          size="tiny"
          style="width:80%; margin-top:2px;"
          @click.stop="() => {}"
        >
        <template #suffix>
          .
          <span style="color: #aa9b9b">
            {{assetFileDetail.extension}}
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
          fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
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
            Download
          </n-button>
        </div>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import JSZip from 'jszip'
import { useSoundStore } from 'store/modules/sound'
import { Sound } from '@/class/sound'
import { type MessageApi, useMessage } from 'naive-ui'
import { Sprite } from '@/class/sprite'
import { useSpriteStore } from '@/store'
import { NButton, NInput, NImage, NGrid, NGridItem } from 'naive-ui'
import SoundsImport from "@/assets/image/sounds/sounds-import.svg"
import { commonColor } from '@/assets/theme'
import error from '@/assets/image/library/error.svg'
interface AssetFileDetail {
  name: string
  extension: string
  url: string
  blob: Blob
}

const soundStore = useSoundStore()
const spriteStore = useSpriteStore()
const assetFileDetails = ref<AssetFileDetail[]>([])
const selectedAssets = ref<AssetFileDetail[]>([])
const fileUploadInput = ref(null)
const message: MessageApi = useMessage()

/* Return true if asset is an image */
const isImage = (assetDetail: AssetFileDetail) => {
  return ['svg', 'jpeg', 'jpg', 'png'].includes(assetDetail.extension.toLowerCase());
}

function triggerFileUpload() {
  if(fileUploadInput.value){
    (fileUploadInput.value as HTMLInputElement).click()
  }
}

/* Handle Scratch File Upload. Only.sb3 files are supported */
const handleScratchFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) {
    return
  }
  const file = input.files[0]
  const zip = await JSZip.loadAsync(file)

  // Parses and restores the filename
  const projectJson = await zip.file('project.json')?.async('string')
  const projectData = JSON.parse(projectJson || '{}')
  const assetNameMap = new Map<string, string>()
  projectData.targets.forEach((target: any) => {
    target.costumes.forEach((costume: any) => {
      assetNameMap.set(costume.md5ext, costume.name + '.' + costume.dataFormat)
    })
    target.sounds.forEach((sound: any) => {
      assetNameMap.set(sound.md5ext, sound.name + '.' + sound.dataFormat)
    })
  })

  // Modify the loop that processes files to handle different types of images and audio files.
  for (const filename of Object.keys(zip.files)) {
    const extensionMatch = filename.match(/\.(svg|jpeg|jpg|png|wav|mp3)$/)
    if (extensionMatch) {
      const originalName = assetNameMap.get(filename)
      if (!originalName) continue
      const fileData = await zip.file(filename)!.async('blob')
      const mimeType = getMimeType(extensionMatch[1]) // Use a function to determine MIME type
      const blob = new Blob([fileData], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const name = originalName.split('.').slice(0, -1).join('.');
      const extension = originalName.split('.').pop() || '';
      assetFileDetails.value.push({ name: name, extension: extension, url, blob })
    }
  }
}

// Function to determine the MIME type based on the file extension
function getMimeType(extension: string): string {
  switch (extension) {
    case 'svg':
      return 'image/svg+xml'
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'wav':
      return 'audio/wav'
    case 'mp3':
      return 'audio/mpeg'
    default:
      return 'application/octet-stream'
  }
}

/* Get the full asset name like "meow.wav" */
const getFullAssetName = (asset: AssetFileDetail): string => {
  return asset.name + "." + asset.extension;
};

/* Add a method for playing audio directly in the browser */
const playAudio = (audioUrl: string) => {
  const audio = new Audio(audioUrl)
  audio.play()
}

/* Choose one asset  */
const chooseAsset = (asset: AssetFileDetail) => {
  if(selectedAssets.value){
    const index = selectedAssets.value.findIndex(a => a.name === asset.name);
  if (index !== -1) {
    selectedAssets.value.splice(index, 1);
  } else {
    selectedAssets.value.push(asset);
  }
  }
};

/* Download asset file */
const downloadAsset = (asset: AssetFileDetail) => {
  const a = document.createElement('a')
  a.href = asset.url
  a.download = getFullAssetName(asset)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/* Import the selected asset to project */
const importSelectedAssetToProject = () => {
  if (!selectedAssets.value) return;
  selectedAssets.value.forEach(asset => {
    const file = getFileFromAssetFileDetail(asset);
    if (isImage(asset)) {
      importSpriteToProject(asset, file);
    } else {
      importSoundToProject(asset, file);
    }
  })
  showImportSuccessMessage();
}

/* Import sound file to current project */
const importSoundToProject = (asset: AssetFileDetail, file: File) => {
  const sound = new Sound(getNewNameIfNameExists(asset, soundStore), [file]);
  soundStore.addItem(sound);
};

/* Import sprite file to current project */
const importSpriteToProject = (asset: AssetFileDetail, file: File) => {
  const sprite = new Sprite(getNewNameIfNameExists(asset, spriteStore), [file])
  spriteStore.addItem(sprite)
}

/* If sound.wav exists, return sound(1).wav, sound(2).wav ..... */
const getNewNameIfNameExists = (asset: AssetFileDetail, store: any): string => {
  let baseName = asset.name;
  const extension = asset.extension;
  let counter = 0;
  let newName = baseName;
  const existsByName = (name: string, store: any): boolean => {
    return store.existsByName(name);
  }
  while (existsByName(`${newName}.${extension}`, store)) {
    counter++;
    newName = `${baseName}(${counter})`;
  }
  return `${newName}.${extension}`;
}

/* Get file from AssetFileDetail */
const getFileFromAssetFileDetail = (asset: AssetFileDetail): File => {
  return new File([asset.blob], getFullAssetName(asset), { type: asset.blob.type })
}

/* Show 'import successfully' message */
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

  .selected-btn{
    background:#a6a6a680;
    color:white;
  }
  .file-row {
    margin: auto;
    margin-top: 10px;
    width:80%;
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
  .custom-upload-btn, .custom-import-btn {
    font-size: 16px;
    color: rgb(0, 0, 0);
    border-radius: 20px;
    border: 2px solid rgb(0, 20, 41);
    box-shadow: rgb(0, 20, 41) -1px 2px;
    cursor: pointer;
    background-color: rgb(255, 248, 204);
    margin-left:5px;
    font-family: ChauPhilomeneOne;
  }

  .custom-upload-btn:hover, .custom-import-btn:hover {
    background-color: rgb(255, 234, 204);
  }
}




</style>
