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
      <n-upload
        v-if="props.type == 'backdrop'"
        :action="uploadActionUrl"
        @before-upload="beforeBackdropUpload"
      >
        <n-button color="#fff" quaternary size="tiny" text-color="#fff">
          {{ $t("stage.upload") }}
        </n-button>
      </n-upload>
      <n-upload
        v-else
        :action="uploadActionUrl"
        @before-upload="beforeSpriteUpload"
      >
        <n-button color="#fff" :text-color="commonColor"> {{ $t('stage.upload') }} </n-button>
      </n-upload>

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
        v-else
        color="#fff"
        :text-color="commonColor"
        @click="openLibraryFunc()"
      >
      {{ $t("stage.choose") }}
      </n-button>
      <!-- E Component Add Button second step -->
    </div>
  </div>
  <!-- E Component Add Button type second step -->
  <!-- S Modal Library -->
  <LibraryModal
    v-model:show="showModal"
    :type="props.type"
    @add-asset-to-store="handleAssetAddition"
  />
  <!-- E Modal Library -->
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { ref, defineProps, computed } from "vue";
import type { UploadFileInfo } from "naive-ui";
import { NIcon, NUpload, NButton, useMessage } from "naive-ui";
import { Add as AddIcon } from "@vicons/ionicons5";
import { commonColor } from "@/assets/theme";
import { useSpriteStore } from "@/store/modules/sprite";
import { useBackdropStore } from "@/store/modules/backdrop";
import LibraryModal from "@/components/spx-library/LibraryModal.vue";
import { Sprite } from "@/class/sprite";
import FileWithUrl from "@/class/file-with-url";

// ----------props & emit------------------------------------
interface PropType {
  type: string;
}
const props = defineProps<PropType>();
const message = useMessage();
const spriteStore = useSpriteStore();
const backdropStore = useBackdropStore();

// ----------data related -----------------------------------
// TODO: change uploadActionUrl to real backend url.
const uploadActionUrl = "https://www.mocky.io/v2/5e4bafc63100007100d8b70f";

// Ref about showing modal or not.
const showModal = ref<boolean>(false);

// Ref about showing upload buttons or not.
const showUploadButtons = ref<boolean>(false);

// ----------computed properties-----------------------------
// Computed variable about changing css style by props.type.
const addBtnClassName = computed(() =>
  props.type === "backdrop" ? "backdrop-add-div" : "sprite-add-div"
);

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
 * @param {*} isBg
 * @Author: Xu Ning
 * @Date: 2024-01-16 11:53:40
 */
const openLibraryFunc = () => {
  showModal.value = true;
};

/**
 * @description: A Function about checking the file before it upload.
 * @param {*} data
 * @param {*} isBg
 * @Author: Xu Ning
 * @Date: 2024-01-24 11:47:18
 */
const beforeUpload = (data: {file: UploadFileInfo;fileList: UploadFileInfo[];},isBg: boolean) => {
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
    if (isBg) {
      let backdrop = backdropStore.backdrop;
      backdrop.addFile(...fileArray)
    } else {
      let sprite = new Sprite(fileNameWithoutExtension, [uploadFile.file]);
      // const sprite = new Sprite(fileNameWithoutExtension, fileArray);uploadFile.file
      spriteStore.addItem(sprite);
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
  beforeUpload(data, true);
};

/**
 * @description: A Function before uploading Sprite.
 * @param {*} data
 * @Author: Xu Ning
 * @Date: 2024-01-24 11:48:33
 */
const beforeSpriteUpload = (data: {
  file: UploadFileInfo;
  fileList: UploadFileInfo[];
}) => {
  beforeUpload(data, false);
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
 * @param {*} spriteName
 * @Author: Xu Ning
 * @Date: 2024-01-30 11:47:25
 */
 const handleAssetAddition = async (name: string, address: string) => {
  if (props.type === 'sprite') {
    const file = await urlToFile(address, name);
    const sprite = new Sprite(name, [file]);
    spriteStore.addItem(sprite);
    message.success(`add ${name} successfully!`)
  } else if (props.type === 'backdrop') {
    const file = await urlToFile(address, name);
    backdropStore.backdrop.addFile(file);
    message.success(`add ${name} successfully!`)
  }
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
</style>
