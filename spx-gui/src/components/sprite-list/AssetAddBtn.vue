<template>
  <!-- S Component Add Button -->
  <div :class="addBtnClassName" @click="handleAddButtonClick">
    <!-- S Component Add Button type first step -->
    <div v-if="!showUploadButtons" class="add-new">
      <n-icon style="padding-bottom: 15px">
        <AddIcon />
      </n-icon>
      <div v-if="addBtnClassName == 'sprite-add-div'" class="add-new-font">
        {{ $t('stage.add') }}
      </div>
    </div>
    <!-- E Component Add Button type first step -->
    <!-- S Component Add Button type second step -->
    <div v-else class="add-buttons">
      <!-- Background Upload -->
      <n-upload v-if="props.type === 'backdrop'" @before-upload="beforeBackdropUpload">
        <n-button color="#fff" quaternary size="tiny" text-color="#fff">
          {{ $t('stage.upload') }}
        </n-button>
      </n-upload>

      <!-- Sound Upload -->
      <n-upload v-else-if="props.type === 'sound'" @before-upload="beforeSoundUpload">
        <n-button color="#fff" :text-color="commonColor"> {{ $t('stage.upload') }} </n-button>
      </n-upload>

      <!-- Sprite Upload -->
      <div v-else>
        <n-button color="#fff" :text-color="commonColor" @click="showUploadModal = true">
          {{ $t('stage.upload') }}
        </n-button>
      </div>

      <n-button
        v-if="props.type == 'backdrop'"
        color="#fff"
        quaternary
        size="tiny"
        text-color="#fff"
        @click="openLibraryFunc()"
      >
        {{ $t('stage.choose') }}
      </n-button>
      <n-button
        v-else-if="props.type == 'sprite'"
        color="#fff"
        :text-color="commonColor"
        @click="openLibraryFunc()"
      >
        {{ $t('stage.choose') }}
      </n-button>

      <n-button
        v-if="props.type == 'sound'"
        color="#fff"
        :text-color="commonColor"
        @click="openRecorderFunc()"
      >
        Record
      </n-button>

      <!-- E Component Add Button second step -->
    </div>
  </div>
  <!-- E Component Add Button type second step -->
  <!-- S Modal Library -->
  <LibraryModal v-model:show="showModal" :type="props.type" @add-asset="handleAssetAddition" />
  <!-- E Modal Library -->

  <!-- S Sound Recorder -->
  <SoundRecorder v-model:show="showRecorder" />
  <!-- E Sound Recorder -->

  <!-- S Modal Sprite Multi Costume Upload -->
  <n-modal
    v-model:show="showUploadModal"
    preset="card"
    :style="bodyStyle"
    header-style="padding:11px 24px 11px 30%;"
    content-style="margin:10px;"
  >
    <div class="modal-items">
      <p class="modal-items-p">{{ $t('list.name') }}</p>
      <n-input
        v-model:value="uploadSpriteName"
        round
        :placeholder="$t('list.inputName')"
        class="modal-items-content"
        style="max-width: 300px"
      />
    </div>
    <div class="modal-items">
      <p class="modal-items-p">{{ $t('list.costumes') }}:</p>
      <n-upload
        class="modal-items-content"
        list-type="image-card"
        multiple
        @change="handleWatchFileList"
      />
    </div>
    <div class="modal-items">
      <p class="modal-items-p">{{ $t('list.category') }}:</p>
      <n-select
        v-model:value="categoryValue"
        :placeholder="$t('list.selectCategory')"
        class="modal-items-content"
        :options="categoryOptions"
      />
    </div>
    <div class="modal-items">
      <p class="modal-items-p">{{ $t('list.public') }}</p>
      <n-select
        v-model:value="publicValue"
        default-value="not public"
        class="modal-items-content"
        :options="publicOptions"
      />
    </div>
    <div style="width: 100%; text-align: center">
      <n-button :disabled="!spriteNameAllow" @click="handleSubmitSprite()">
        {{ $t('list.submit') }}
      </n-button>
    </div>
  </n-modal>
  <!-- E Modal Sprite Multi Costume Upload -->
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { computed, defineProps, ref } from 'vue'
import type { UploadFileInfo } from 'naive-ui'
import { NButton, NIcon, NInput, NModal, NSelect, NUpload, useMessage } from 'naive-ui'
import { Add as AddIcon } from '@vicons/ionicons5'
import { commonColor } from '@/assets/theme'
import { useSpriteStore } from '@/store/modules/sprite'
import { useBackdropStore } from '@/store/modules/backdrop'
import LibraryModal from '@/components/spx-library/LibraryModal.vue'
import { Sprite } from '@/class/sprite'
import FileWithUrl from '@/class/file-with-url'
import { useSoundStore } from 'store/modules/sound'
import { Sound } from '@/class/sound'
import SoundRecorder from 'comps/sounds/SoundRecorder.vue'
import { generateGifByCostumes, publishAsset, PublishState } from '@/api/asset'
import { useI18n } from 'vue-i18n'
import { AssetType } from '@/constant/constant'
import { isValidAssetName } from '@/util/asset'

// ----------props & emit------------------------------------
interface PropType {
  type: string
}
const props = defineProps<PropType>()
const message = useMessage()
const spriteStore = useSpriteStore()
const backdropStore = useBackdropStore()
const soundStore = useSoundStore()
const { t } = useI18n({
  inheritLocale: true
})
const categoryOptions = computed(() => [
  { label: t('category.animals'), value: 'Animals' },
  { label: t('category.people'), value: 'People' },
  { label: t('category.sports'), value: 'Sports' },
  { label: t('category.food'), value: 'Food' },
  { label: t('category.fantasy'), value: 'Fantasy' }
])

const publicOptions = computed(() => [
  { label: t('publicState.notPublish'), value: PublishState.NotPublished },
  { label: t('publicState.private'), value: PublishState.PrivateLibrary },
  { label: t('publicState.public'), value: PublishState.PublicAndPrivateLibrary }
])
// ----------data related -----------------------------------
// Ref about category of upload sprite.
const categoryValue = ref<string>()

// Ref about publish upload sprite or not.
const publicValue = ref<number>(PublishState.NotPublished)

// Ref about show modal or not.
const showModal = ref<boolean>(false)

// Ref about show upload buttons or not.
const showUploadButtons = ref<boolean>(false)

// Ref about show sound recorder or not.
const showRecorder = ref<boolean>(false)

// Style about upload modal body.
const bodyStyle = { width: '600px', margin: 'auto' }

// Ref about show upload modal or not.
const showUploadModal = ref<boolean>(false)

// Ref about watch upload file list.
const uploadFileList = ref<UploadFileInfo[]>([])

// Ref about upload sprite's name.
const uploadSpriteName = ref('')

// ----------computed properties-----------------------------
// Computed variable about changing css style by props.type.
const addBtnClassName = computed(() => {
  if (props.type === 'backdrop') {
    return 'backdrop-add-div'
  } else if (props.type === 'sprite') {
    return 'sprite-add-div'
  } else {
    return 'sound-add-div'
  }
})

// Computed  spritename is legal or not
const spriteNameAllow = computed(() => {
  return isValidAssetName(uploadSpriteName.value)
})

// ----------methods-----------------------------------------

/**
 * @description: A Function about clicking add button to change button style.
 * @Author: Xu Ning
 * @Date: 2024-01-18 20:31:00
 */
const handleAddButtonClick = () => {
  showUploadButtons.value = !showUploadButtons.value
}

/**
 * @description: A Function about opening library modal.
 * @Author: Xu Ning
 * @Date: 2024-01-16 11:53:40
 */
const openLibraryFunc = () => {
  showModal.value = true
}

/**
 * @description: A Function about opening recorder.
 * @Author: Yao xinyue
 * @Date: 2024-02-20 13:51:22
 */
const openRecorderFunc = () => {
  showRecorder.value = true
}

/**
 * Function to check the file before upload.
 * @param {Object} data - Contains the file and fileList.
 * @param {string} fileType - Type of the file being uploaded: 'background', 'sprite', or 'sound'.
 * @returns {boolean} - True if the file is valid and processed for upload, false otherwise.
 */
const beforeUpload = (
  data: { file: UploadFileInfo; fileList: UploadFileInfo[] },
  fileType: 'backdrop' | 'sound'
) => {
  let uploadFile = data.file
  if (uploadFile.file) {
    let fileURL = URL.createObjectURL(uploadFile.file)
    let fileWithUrl = new FileWithUrl(uploadFile.file, fileURL)

    let fileName = uploadFile.name
    let fileNameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'))
    switch (fileType) {
      case 'backdrop': {
        let backdrop = backdropStore.backdrop
        backdrop.addScene([{ name: fileNameWithoutExtension, file: fileWithUrl }])
        break
      }
      case 'sound': {
        let sound = new Sound(fileNameWithoutExtension, [uploadFile.file])
        soundStore.addItem(sound)
        break
      }
      default:
        message.error('Unsupported file type')
        return false
    }
  } else {
    message.error('Invalid or non-existent uploaded files')
    return false
  }
  return true
}

/**
 * @description: A Function before uploading Backdrop.
 * @param {*} data - default params in naive-ui upload component
 * @Author: Xu Ning
 * @Date: 2024-01-24 11:47:59
 */
const beforeBackdropUpload = (data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) => {
  beforeUpload(data, 'backdrop')
}

/**
 * @description: A Function before uploading Sprite.
 * @param {*} data - default params in naive-ui upload component
 * @Author: Xu Ning
 * @Date: 2024-01-24 11:48:33
 */

const handleWatchFileList = (data: {
  file: UploadFileInfo
  fileList: UploadFileInfo[]
  event?: Event
}) => {
  uploadFileList.value = [...data.fileList]
}

/**
 * @description: A Function about submitting multi costume sprite to project and store status.
 * @return {*}
 * @Author: Xu Ning
 * @Date: 2024-02-21 17:48:33
 */
const handleSubmitSprite = async () => {
  let uploadFilesArr: File[] = []
  uploadFileList.value.forEach((fileItem: UploadFileInfo) => {
    if (fileItem && fileItem.file) {
      uploadFilesArr.push(fileItem.file)
    }
  })
  let sprite = new Sprite(uploadSpriteName.value, uploadFilesArr)
  spriteStore.addItem(sprite)
  message.success(`Added ${uploadSpriteName.value} to list successfully!`)

  try {
    let gifRes = undefined

    if (uploadFilesArr.length > 1) {
      const response = await generateGifByCostumes(uploadFilesArr)
      gifRes = response.data.data
    }

    await publishAsset(
      uploadSpriteName.value,
      uploadFilesArr,
      AssetType.Sprite,
      publicValue.value,
      gifRes,
      categoryValue.value || undefined
    )
  } catch (err) {
    message.error(`Failed to upload ${uploadSpriteName.value}`)
  }
  uploadSpriteName.value = ''
  showUploadModal.value = false
}

/**
 * @description: A Function before uploading Sound.
 * @param {*} data - default params in naive-ui upload component
 * @Author: Yao xinyue
 * @Date: 2024-02-19 12:27:59
 */
const beforeSoundUpload = (data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) => {
  beforeUpload(data, 'sound')
}

/**
 * @description: Fetches data from a URL and returns it as a File object.
 * @param {*} url - The URL to fetch the data from.
 * @param {*} filename - The name of the file to create.
 * @returns {Promise<File>} A promise that resolves to a File object.
 * @Author: Xu Ning
 * @Date: 2024-01-31 22:06:32
 */
async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const data = await response.blob()
  return new File([data], filename, { type: data.type })
}

/**
 * @description: A function to add sprite to list store.
 * @param {*} name - added asset name
 * @param {*} address - added asset file url
 * @Author: Xu Ning
 * @Date: 2024-01-30 11:47:25
 */
const handleAssetAddition = async (name: string, address: string) => {
  if (props.type === 'sprite') {
    const file = await urlToFile(address, name)
    const sprite = new Sprite(name, [file])
    spriteStore.addItem(sprite)
  } else if (props.type === 'backdrop') {
    const file = await urlToFile(address, name)
    backdropStore.backdrop.addFile(file)
  } else if (props.type === 'sounds') {
    const file = await urlToFile(address, name)
    const sound = new Sound(name, [file])
    soundStore.addItem(sound)
  }
  message.success(`add ${name} successfully!`)
}
</script>

<style scoped lang="scss">
@import '@/assets/theme.scss';

.modal-items {
  display: flex;
  align-items: center;
  justify-content: start;
  width: 100%;
  padding: 10px;
  .modal-items-p {
    margin: 0;
    flex-shrink: 0;
  }
  .modal-items-content {
    flex-grow: 1;
    margin: 0 8px;
  }
}

@mixin addDivBase {
  margin: 10px auto;
  border-radius: 20px;
  background: $sprite-list-card-box-shadow;
  box-shadow: 0 0 5px $sprite-list-card-box-shadow;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: visible; // show x button
  cursor: pointer;

  .add-new {
    color: white;
    .add-new-font {
      text-align: center;
    }
  }

  .n-icon {
    width: auto;
  }
}

.backdrop-add-div {
  @include addDivBase;
  width: 60px;
  height: 60px;

  .n-icon svg {
    height: 30px;
    width: 30px;
  }
}

.sprite-add-div {
  @include addDivBase;
  margin-top: 10px;
  width: 110px;
  height: 110px;

  .add-buttons .n-button {
    margin-top: 10px;
  }

  .n-icon svg {
    height: 65px;
    width: 65px;
  }
}

.sound-add-div {
  @include addDivBase;
  margin-top: 10px;
  margin-left: 0;
  margin-bottom: 26px;
  width: 120px;
  height: 120px;
  border-radius: 20px;

  .add-buttons .n-button {
    margin-top: 10px;
  }
  .n-icon svg {
    height: 65px;
    width: 65px;
  }
}
</style>
