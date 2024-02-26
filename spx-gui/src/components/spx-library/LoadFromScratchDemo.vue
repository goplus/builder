<template>
  <div>Only.sp3 files are supported</div>
  <input type="file" id="upload" accept=".sb3" @change="handleScratchFileUpload">
  <div id="download-links">
    <div v-for="link in downloadLinks" :key="link.name" class="file-row">
      {{ link.name }}
      <button @click="chooseAsset(link)">Choose</button>
      <button @click="downloadAsset(link)">Download</button>
    </div>
  </div>
  <div v-if="selectedAsset" class="rename-section">
    <input v-model="newAssetName" type="text" placeholder="Enter new asset name">
    <button @click="renameFile">Save</button>
    <button @click="importFile">Import to spx project</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import JSZip from 'jszip';
import { useSoundStore } from 'store/modules/sound'
import { Sound } from '@/class/sound'
import { type MessageApi, useMessage } from 'naive-ui'
import { Sprite } from '@/class/sprite'
import { useSpriteStore } from '@/store'

interface AssetFileDetail {
  name: string;
  url: string;
  blob: Blob;
}

const soundStore = useSoundStore()
const spriteStore = useSpriteStore()
const downloadLinks = ref<AssetFileDetail[]>([]);
const selectedAsset = ref<AssetFileDetail | null>(null);
const newAssetName = ref('');
const message: MessageApi = useMessage();

/* Handle Scratch File Upload. Only.sb3 files are supported*/
const handleScratchFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) {
    return;
  }
  const file = input.files[0];
  const zip = await JSZip.loadAsync(file);

  // Parses and restores the filename
  const projectJson = await zip.file("project.json")?.async("string");
  const projectData = JSON.parse(projectJson || '{}');
  const assetNameMap = new Map<string, string>();
  projectData.targets.forEach((target: any) => {
    target.costumes.forEach((costume: any) => {
      assetNameMap.set(costume.md5ext, costume.name + '.' + costume.dataFormat);
    });
    target.sounds.forEach((sound: any) => {
      assetNameMap.set(sound.md5ext, sound.name + '.' + sound.dataFormat);
    });
  });

  for (const filename of Object.keys(zip.files)) {
    if (filename.endsWith('.wav') || filename.endsWith('.svg')) {
      const originalName = assetNameMap.get(filename);
      if (!originalName) continue;
      const fileData = await zip.file(filename)!.async('blob');
      const blob = new Blob([fileData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      downloadLinks.value.push({ name: originalName, url, blob });
    }
  }
};

/* Choose one asset */
const chooseAsset = (asset : AssetFileDetail) => {
  selectedAsset.value = asset;
  newAssetName.value = selectedAsset.value.name.substring(0, selectedAsset.value.name.lastIndexOf('.')); // get name
};

/* Download asset file */
const downloadAsset = (asset : AssetFileDetail) => {
  const a = document.createElement('a');
  a.href = asset.url;
  a.download = asset.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/* Change the selected asset name */
const renameFile = () => {
  if (selectedAsset.value && newAssetName.value) {
    const originalNameParts = selectedAsset.value.name.split('.');
    const extension = originalNameParts.pop();
    const newNameWithExtension = `${newAssetName.value}.${extension}`;
    const newBlob = new Blob([selectedAsset.value.blob], { type: 'application/octet-stream' });
    const newUrl = URL.createObjectURL(newBlob);
    selectedAsset.value.name = newNameWithExtension;
    selectedAsset.value.url = newUrl;
    newAssetName.value = '';
    selectedAsset.value = null;
  }
};

/* Import the selected asset to project */
const importFile = () => {
  if (!selectedAsset.value) return;
  const fileName = selectedAsset.value.name;
  const fileExtension = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2);
  const file = getFileFromAssetFileDetail(selectedAsset.value);
  if (fileExtension === 'wav') {
    importWavToProject(newAssetName.value, file);
  } else if (fileExtension === 'svg') {
    importSvgToProject(newAssetName.value, file);
  }
  showImportSuccessMessage();
};

/* Import wav file to current project */
const importWavToProject = (name :string, file: File) => {
  const sound = new Sound(name, [file])
  soundStore.addItem(sound)
}

/* Import svg file to current project */
const importSvgToProject = (name :string, file : File) => {
  const sprite = new Sprite(name, [file])
  spriteStore.addItem(sprite)
}

/* Get file from AssetFileDetail*/
function getFileFromAssetFileDetail(asset: AssetFileDetail): File {
  return new File([asset.blob], asset.name, { type: asset.blob.type });
}

/* Show 'import successfully' message*/
const showImportSuccessMessage = () => {
  message.success(
    'import successfully!',
    { duration: 1000 }
  );
}

</script>

<style scoped>
.download-link {
  display: block;
  margin-top: 8px;
}
</style>
