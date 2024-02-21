<template>
  <!-- S Component Add Button -->
  <div :class="addBtnClassName" @click="handleAddButtonClick">
    <!-- S Component Add Button type first step -->
    <div v-if="!showUploadButtons" class="add-new" >
      <n-icon style="padding-bottom: 15px">
        <AddIcon />
      </n-icon>
      <div v-if="addBtnClassName == 'sprite-add-div'" class="add-new-font">
        {{ $t("stage.add") }}
      </div>
    </div>
    <!-- E Component Add Button type first step -->
    <!-- S Component Add Button type second step -->
    <div v-else class="add-buttons" >

      <!-- Background Upload -->
      <n-upload
        v-if="props.type === 'backdrop'"
        :action="uploadActionUrl"
        @before-upload="beforeBackdropUpload"
      >
        <n-button color="#fff" quaternary size="tiny" text-color="#fff">  {{ $t("stage.upload") }} </n-button>
      </n-upload>

      <!-- Sound Upload -->
      <n-upload
        v-else-if="props.type === 'sound'"
        :action="uploadActionUrl"
        @before-upload="beforeSoundUpload"
      >
        <n-button color="#fff" :text-color="commonColor">  {{ $t("stage.upload") }} </n-button>
      </n-upload>

      <!-- Sprite Upload -->
      <!-- <n-upload
        v-else
        :action="uploadActionUrl"
        @before-upload="beforeSpriteUpload"
      >
        <n-button color="#fff" :text-color="commonColor">  {{ $t("stage.upload") }} </n-button>
      </n-upload> -->
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
        {{ $t("stage.choose") }}
      </n-button>
      <n-button
        v-else-if="props.type == 'sprite'"
        color="#fff"
        :text-color="commonColor"
        @click="openLibraryFunc()"
      >
        {{ $t("stage.choose") }}
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
  <LibraryModal
    v-model:show="showModal"
    :type="props.type"
    @add-asset="handleAssetAddition"
  />
  <!-- E Modal Library -->

  <!-- S Sound Recorder -->
  <SoundRecorder
    v-model:show="showRecorder"
  />
  <!-- E Sound Recorder -->

      <!-- S Modal Sprite Multi Costume Upload -->
      <n-modal
      v-model:show="showUploadModal"
      preset="card"
      :style="bodyStyle"
      header-style="padding:11px 24px 11px 30%;"
      content-style="margin:10px;"
    >
      <div
        style="display: flex; align-items: center; justify-content: start; width: 100%; padding: 10px"
      >
        <p style="margin: 0; flex-shrink: 0">{{ $t('list.name') }}:</p>
        <n-input round placeholder="Input sprite name" style="flex-grow: 1; margin: 0 8px; max-width:300px;"/>
      </div>
      <div
        style="display: flex; align-items: center; justify-content: start; width: 100%; padding: 10px"
      >
        <p style="margin: 0; flex-shrink: 0">{{ $t('list.costumes') }}:</p>
        <n-upload
          style="flex-grow: 1; margin: 0 8px"
          list-type="image-card"
          multiple
          @before-upload="beforeSpriteUpload"
          @remove="removeUploadCostume"
        />
        <!-- <n-upload
          style="flex-grow: 1; margin: 0 8px"
          :action="uploadActionUrl"
          @before-upload="beforeSpriteUpload"
          list-type="image-card"
          multiple
        /> -->
      </div>
      <div style="width:100%; text-align: center">
        <n-button @click="handleSubmitSprite()">
        {{ $t('list.submit') }}
      </n-button>
    </div>
      
    </n-modal>
    <!-- E Modal Sprite Multi Costume Upload -->
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { ref, defineProps, computed } from "vue";
import type { UploadFileInfo } from "naive-ui";
import { NIcon, NUpload, NButton, useMessage, NModal, NInput } from "naive-ui";
import { Add as AddIcon } from "@vicons/ionicons5";
import { commonColor } from "@/assets/theme";
import { useSpriteStore } from "@/store/modules/sprite";
import { useBackdropStore } from "@/store/modules/backdrop";
import LibraryModal from "@/components/spx-library/LibraryModal.vue";
import { Sprite } from "@/class/sprite";
import FileWithUrl from "@/class/file-with-url";
import { useSoundStore } from 'store/modules/sound'
import { Sound } from '@/class/sound'
import SoundRecorder from 'comps/sounds/SoundRecorder.vue'

// ----------props & emit------------------------------------
interface PropType {
  type: string;
}
const props = defineProps<PropType>();
const message = useMessage();
const spriteStore = useSpriteStore();
const backdropStore = useBackdropStore();
const soundStore = useSoundStore();

// ----------data related -----------------------------------
// TODO: change uploadActionUrl to real backend url.
const uploadActionUrl = "https://www.mocky.io/v2/5e4bafc63100007100d8b70f";

// Ref about show modal or not.
const showModal = ref<boolean>(false);

// Ref about show upload buttons or not.
const showUploadButtons = ref<boolean>(false);

// Ref about show sound recorder or not.
const showRecorder = ref<boolean>(false);

  // Style about upload modal body.
  const bodyStyle = { width: '600px', margin: 'auto' }

  // Ref about show upload modal or not.
  const showUploadModal = ref<boolean>(false)

// ----------computed properties-----------------------------
// Computed variable about changing css style by props.type.
const addBtnClassName = computed(() => {
  if (props.type === "backdrop") {
    return "backdrop-add-div";
  } else if (props.type === "sprite") {
    return "sprite-add-div";
  } else {
    return "sound-add-div";
  }
});


// ----------methods-----------------------------------------
/**
 * @description: A Function about clicking add button to change button style.
 * @Author: Xu Ning
 * @Date: 2024-01-18 20:31:00
 */
const handleAddButtonClick = () => {
  showUploadButtons.value = !showUploadButtons.value;
};

/**
 * @description: A Function about opening library modal.
 * @Author: Xu Ning
 * @Date: 2024-01-16 11:53:40
 */
const openLibraryFunc = () => {
  showModal.value = true;
};

/**
 * @description: A Function about opening recorder.
 * @Author: Yao xinyue
 * @Date: 2024-02-20 13:51:22
 */
const openRecorderFunc = () => {
  showRecorder.value = true;
};

/**
 * Function to check the file before upload.
 * @param {Object} data - Contains the file and fileList.
 * @param {string} fileType - Type of the file being uploaded: 'background', 'sprite', or 'sound'.
 * @returns {boolean} - True if the file is valid and processed for upload, false otherwise.
 */
const beforeUpload = (data: {file: UploadFileInfo; fileList: UploadFileInfo[];}, fileType: 'backdrop' | 'sprite' | 'sound') => {
  let uploadFile = data.file;
  if (uploadFile.file) {
    let fileURL = URL.createObjectURL(uploadFile.file);
    let fileWithUrl = new FileWithUrl(uploadFile.file, fileURL);

    let fileArray: FileWithUrl[] = [fileWithUrl];
    let fileName = uploadFile.name;
    let fileNameWithoutExtension = fileName.substring(
      0,
      fileName.lastIndexOf(".")
    );
    switch (fileType) {
      case 'backdrop': {
        let backdrop = backdropStore.backdrop;
        backdrop.addFile(...fileArray);
        break;
      }
      case 'sprite': {
        let sprite = new Sprite(fileNameWithoutExtension, [uploadFile.file]);
        spriteStore.addItem(sprite);
        break;
      }
      case 'sound': {
        let sound = new Sound(fileNameWithoutExtension, [uploadFile.file]);
        soundStore.addItem(sound);
        break;
      }
      default:
        message.error("Unsupported file type");
        return false;
    }
  } else {
    message.error("Invalid or non-existent uploaded files");
    return false;
  }
  return true;
};

/**
 * @description: A Function before uploading Backdrop.
 * @param {*} data
 * @Author: Xu Ning
 * @Date: 2024-01-24 11:47:59
 */
const beforeBackdropUpload = (data: {file: UploadFileInfo;fileList: UploadFileInfo[];}) => {
  beforeUpload(data, "backdrop");
};

  /**
   * @description: A Function before uploading Sprite.
   * @param {*} data
   * @Author: Xu Ning
   * @Date: 2024-01-24 11:48:33
   */
   const a:any = ref([])
   const beforeSpriteUpload = (data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) => {
      //更新一个数组，保持a.value 是 data.fileList 并且加上data.file，作为一个数组
    // 当点击submit的时候，执行spritebeforeUpload，遍历a.value，获取各个对象的.file，并且把他们变成fileArray, 推入到sprite中，请帮我做？
    
    a.value = [...data.fileList];
  
    console.log('beforeSpriteUpload',a.value, data,data.file,data.fileList)
    // beforeUpload(data, false)
  }
  const handleSubmitSprite = () =>{
    console.log('a.value', a.value)
  }
  
  const removeUploadCostume = (data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) => {
    a.value = [...data.fileList]
    console.log('removeUploadCostume',a.value, data,data.file,data.fileList)
  
  }
/**
 * @description: A Function before uploading Sound.
 * @param {*} data
 * @Author: Yao xinyue
 * @Date: 2024-02-19 12:27:59
 */
const beforeSoundUpload = (data: {file: UploadFileInfo;fileList: UploadFileInfo[];}) => {
  beforeUpload(data, "sound");
};

/**
 * @description: Fetches data from a URL and returns it as a File object.
 * @param {*} url - The URL to fetch the data from.
 * @param {*} filename - The name of the file to create.
 * @returns {Promise<File>} A promise that resolves to a File object.
 * @Author: Xu Ning
 * @Date: 2024-01-31 22:06:32
 */
async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.blob();
  return new File([data], filename, { type: data.type });
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
    const file = await urlToFile(address, name);
    const sprite = new Sprite(name, [file]);
    spriteStore.addItem(sprite);
  } else if (props.type === 'backdrop') {
    const file = await urlToFile(address, name);
    backdropStore.backdrop.addFile(file);
  } else if (props.type === 'sounds' ) {
    const file = await urlToFile(address, name);
    const sound = new Sound(name, [file]);
    soundStore.addItem(sound);
  }
  message.success(`add ${name} successfully!`)
};

</script>

<style scoped lang="scss">
@import "@/assets/theme.scss";

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
    .add-new-font{
      text-align:center;
      font-family:'Heyhoo'
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
