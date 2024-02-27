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
    <button v-if="selectedAssets.length != 0" class="custom-import-btn" @click="importFile">Import to spx project</button>
  </div>
  <div class="download-links">
    <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
      <n-grid-item v-for="link in downloadLinks" :key="link.name" class="file-row" :style="{border: selectedAssets.includes(link) ? `3px solid ${commonColor}` : '3px solid #eeeeee'}">

        {{link.name}}
        <n-image
          v-if="isImage(link.name)"
          style="position: absolute; top: 25px; left: 15px; border-radius: 20px"
          preview-disabled
          width="110"
          height="110"
          :src="link.url"
          fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
        />
        <n-image
          v-else
          preview-disabled
          style="position: absolute; top: 30px; left: 35px; border-radius: 20px"
          width="80"
          height="80"
          :src="SoundsImport"
          fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
          @click="playAudio(link.url)"
        />
        <div class="file-btn">
          <n-button
            type="primary"
            secondary
            style="height: 24px; padding: 6px;"
            @click="chooseAsset(link)"
            :class="{'selected-btn': selectedAssets.includes(link)}"
          >
          {{ selectedAssets.includes(link) ? 'Cancel' : 'Choose'}}
          </n-button>
          <n-button
            type="primary"
            secondary
            style="height: 24px; padding: 6px"
            @click="downloadAsset(link)"
          >
            Download
          </n-button>
        </div>
      </n-grid-item>
    </n-grid>
  </div>
  <div v-if="selectedAssets.length != 0" class="rename-section">
    <n-input v-model="newAssetName" type="text" placeholder="Enter new asset name" />
    <n-button @click="renameFiles">Save</n-button>
    
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

interface AssetFileDetail {
  name: string
  url: string
  blob: Blob
}

const soundStore = useSoundStore()
const spriteStore = useSpriteStore()
const downloadLinks = ref<AssetFileDetail[]>([])
const selectedAssets = ref<AssetFileDetail[]>([])
const newAssetName = ref('')
const fileUploadInput = ref(null)
const message: MessageApi = useMessage()
const isImage = (url: string) => {
  return /\.(svg|jpeg|jpg|png)$/.test(url)
}

function triggerFileUpload() {
  if(fileUploadInput.value){
    (fileUploadInput.value as HTMLInputElement).click()
  }
}

/* Handle Scratch File Upload. Only.sb3 files are supported*/
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
      downloadLinks.value.push({ name: originalName, url, blob })
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

// Add a method for playing audio directly in the browser
const playAudio = (audioUrl: string) => {
  const audio = new Audio(audioUrl)
  audio.play()
}

/* Choose one asset */
// const chooseAsset = (asset: AssetFileDetail) => {
//   selectedAsset.value = asset
//   newAssetName.value = selectedAsset.value.name.substring(
//     0,
//     selectedAsset.value.name.lastIndexOf('.')
//   ) // get name
// }
// 更新选择逻辑以支持多选
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
  a.download = asset.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/* Change the selected asset name */
// const renameFile = () => {
//   if (selectedAsset.value && newAssetName.value) {
//     const originalNameParts = selectedAsset.value.name.split('.')
//     const extension = originalNameParts.pop()
//     const newNameWithExtension = `${newAssetName.value}.${extension}`
//     const newBlob = new Blob([selectedAsset.value.blob], { type: 'application/octet-stream' })
//     const newUrl = URL.createObjectURL(newBlob)
//     selectedAsset.value.name = newNameWithExtension
//     selectedAsset.value.url = newUrl
//     newAssetName.value = ''
//     selectedAsset.value = null
//   }
// }

// 示例：批量重命名 TODO
const renameFiles = () => {
  selectedAssets.value.forEach(asset => {
    const originalNameParts = asset.name.split('.');
    const extension = originalNameParts.pop();
    const newNameWithExtension = `${newAssetName.value}.${extension}`;
    const newBlob = new Blob([asset.blob], { type: 'application/octet-stream' });
    const newUrl = URL.createObjectURL(newBlob);
    asset.name = newNameWithExtension;
    asset.url = newUrl;
  });
  newAssetName.value = '';
  selectedAssets.value = []; // 清空选中列表
};


/* Import the selected asset to project */
const importFile = () => {
  if (!selectedAssets.value) return
  selectedAssets.value.forEach(asset => {
  const fileName = asset.name
  const fileExtension = fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2)
  const file = getFileFromAssetFileDetail(asset)
  if (fileExtension === 'wav') {
    importWavToProject(fileName, file)
  } else if (fileExtension === 'svg') {
    importSvgToProject(fileName, file)
  }
  showImportSuccessMessage()
})
}

/* Import wav file to current project */
const importWavToProject = (name: string, file: File) => {
  const sound = new Sound(name, [file])
  soundStore.addItem(sound)
}

/* Import svg file to current project */
const importSvgToProject = (name: string, file: File) => {
  const sprite = new Sprite(name, [file])
  spriteStore.addItem(sprite)
}

/* Get file from AssetFileDetail*/
function getFileFromAssetFileDetail(asset: AssetFileDetail): File {
  return new File([asset.blob], asset.name, { type: asset.blob.type })
}

/* Show 'import successfully' message*/
const showImportSuccessMessage = () => {
  message.success('import successfully!', { duration: 1000 })
}
</script>

<style lang="scss" scoped>
@import '@/assets/theme.scss';
.download-infos {
  text-align: center;
}
.download-links {
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
