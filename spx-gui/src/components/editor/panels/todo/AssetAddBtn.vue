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
      <n-upload v-if="props.type === AssetType.Backdrop" @before-upload="beforeBackdropUpload">
        <n-button color="#fff" quaternary size="tiny" text-color="#fff">
          {{ $t('stage.upload') }}
        </n-button>
      </n-upload>

      <!-- Sound Upload -->
      <n-upload v-else-if="props.type === AssetType.Sound" @before-upload="beforeSoundUpload">
        <n-button> {{ $t('stage.upload') }} </n-button>
      </n-upload>

      <!-- Sprite Upload -->
      <div v-else>
        <n-button @click="showUploadModal = true">
          {{ $t('stage.upload') }}
        </n-button>
      </div>

      <n-button
        v-if="props.type == AssetType.Backdrop"
        color="#fff"
        :disabled="!isOnline"
        quaternary
        size="tiny"
        text-color="#fff"
        @click="openLibrary()"
      >
        {{ $t('stage.choose') }}
      </n-button>
      <n-button
        v-else-if="props.type == AssetType.Sprite"
        :disabled="!isOnline"
        @click="openLibrary()"
      >
        {{ $t('stage.choose') }}
      </n-button>

      <n-button v-if="props.type == AssetType.Sound" @click="openRecorderFunc()">
        {{ $t('sounds.record') }}
      </n-button>

      <!-- E Component Add Button second step -->
    </div>
  </div>
  <!-- E Component Add Button type second step -->

  <!-- S Sound Recorder -->
  <SoundRecorder v-if="showRecorder" @close="showRecorder = false" />
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
        >{{ $t('list.uploadLimited') }}
      </n-upload>
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
        v-model:value="publishState"
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
import { Sprite } from '@/models/sprite'
import { fromNativeFile } from '@/models/common/file'
import { Sound } from '@/models/sound'
import SoundRecorder from '@/components/editor/sound/SoundRecorder.vue'
import { addAsset, IsPublic, AssetType } from '@/apis/asset'
import { useI18n } from 'vue-i18n'
import { isImage, isSound } from '@/utils/utils'
import { useNetwork } from '@/utils/network'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { stripExt } from '@/utils/path'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { sprite2Asset, validateSpriteName } from '@/models/common/asset'
import { useAddAssetFromLibrary } from '@/components/library'

// ----------props & emit------------------------------------
interface PropType {
  type: AssetType
}
const props = defineProps<PropType>()
const message = useMessage()
const editorCtx = useEditorCtx()
const { isOnline } = useNetwork()

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
enum PublishState {
  noUpload,
  uploadToPersonal,
  uploadToPublic
}
const publicOptions = computed(() => [
  { label: t('publicState.notPublish'), value: PublishState.noUpload },
  { label: t('publicState.private'), value: PublishState.uploadToPersonal },
  { label: t('publicState.public'), value: PublishState.uploadToPublic }
])
// ----------data related -----------------------------------
// Ref about category of upload sprite.
const categoryValue = ref<string>()

// Ref about publish upload sprite or not.
const publishState = ref<number>(PublishState.noUpload)

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
  if (props.type === AssetType.Backdrop) {
    return 'backdrop-add-div'
  } else if (props.type === AssetType.Sprite) {
    return 'sprite-add-div'
  } else {
    return 'sound-add-div'
  }
})

// Computed  spritename is legal or not
const spriteNameAllow = computed(() => {
  return validateSpriteName(uploadSpriteName.value, editorCtx.project)
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

const addAssetFromLibrary = useAddAssetFromLibrary()

function openLibrary() {
  addAssetFromLibrary(editorCtx.project, props.type)
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
 * @returns {Promise<boolean>} - True if the file is valid and processed for upload, false otherwise.
 */
const beforeUpload = async (
  data: { file: UploadFileInfo; fileList: UploadFileInfo[] },
  fileType: 'backdrop' | 'sound'
) => {
  let uploadFile = data.file
  if (uploadFile.file != null) {
    const file = await fromNativeFile(uploadFile.file)
    let fileName = uploadFile.name
    let assetName = stripExt(fileName)

    switch (fileType) {
      case 'backdrop': {
        if (!isImage(fileName)) {
          message.error(t('message.image'))
          return false
        }
        editorCtx.project.stage.setBackdrop(new Backdrop(assetName, file))
        break
      }
      case 'sound': {
        if (!isSound(fileName)) {
          message.error(t('message.sound'))
          return false
        }
        editorCtx.project.addSound(new Sound(assetName, file))
        break
      }
      default:
        message.error(t('message.fileType'))
        return false
    }
  } else {
    message.error(t('message.other'))
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
  return beforeUpload(data, 'backdrop')
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
const handleSubmitSprite = async (): Promise<void> => {
  for (const fileItem of uploadFileList.value) {
    if (!isImage(fileItem.name)) {
      message.error(t('message.image'))
      return
    }
  }
  const files = await Promise.all(
    uploadFileList.value
      .filter((fileInfo) => fileInfo.file !== null)
      .map((fileInfo) => fromNativeFile(fileInfo.file!))
  )
  const sprite = new Sprite(uploadSpriteName.value)
  const costumes = files.map((f) => new Costume(stripExt(f.name), f))
  for (const costume of costumes) {
    sprite.addCostume(costume)
  }
  editorCtx.project.addSprite(sprite)
  message.success(t('message.success', { uploadSpriteName: uploadSpriteName.value }))

  if (publishState.value !== PublishState.noUpload) {
    const assetData = await sprite2Asset(sprite)
    await addAsset({
      ...assetData,
      displayName: uploadSpriteName.value,
      category: categoryValue.value || '',
      isPublic:
        publishState.value === PublishState.uploadToPersonal ? IsPublic.personal : IsPublic.public,
      preview: 'TODO' // TODO: we should construct preview at frontend when displaying assets, so we do not need to save `preview` to DB
    })
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
  return beforeUpload(data, 'sound')
}
</script>

<style scoped lang="scss">
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
  border: 1px solid #fff;
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
