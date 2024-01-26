<template>
  <!-- S Component Add Button -->
  <div :class="addBtnClassName" @click="handleAddButtonClick">
    <!-- S Component Add Button type first step -->
    <div class="add-new" v-if="!showUploadButtons">
      <n-icon style="padding-bottom: 15px">
        <AddIcon />
      </n-icon>
      <div v-if="addBtnClassName == 'sprite-add-div'" class="add-new-font">
        ADD NEW
      </div>
    </div>
    <!-- E Component Add Button type first step -->
    <!-- S Component Add Button type second step -->
    <div class="add-buttons" v-if="showUploadButtons">
      <n-upload
        v-if="props.type == 'bg'"
        :action="uploadActionUrl"
        @before-upload="beforeBackdropUpload"
      >
        <n-button color="#fff" quaternary size="tiny" text-color="#fff">
          Upload
        </n-button>
      </n-upload>
      <n-upload
        v-else
        :action="uploadActionUrl"
        @before-upload="beforeSpriteUpload"
      >
        <n-button color="#fff" :text-color="commonColor"> Upload </n-button>
      </n-upload>

      <n-button
        v-if="props.type == 'bg'"
        color="#fff"
        quaternary
        size="tiny"
        @click="openLibraryFunc(true)"
        text-color="#fff"
      >
        Choose
      </n-button>
      <n-button
        v-else
        color="#fff"
        @click="openLibraryFunc(false)"
        :text-color="commonColor"
      >
        Choose
      </n-button>
      <!-- E Component Add Button second step -->
    </div>
  </div>
  <!-- E Component Add Button type second step -->
  <!-- S Modal Library -->
  <LibraryModal
    v-model:show="showModal"
    :categories="spriteCategories"
    :spriteInfos="props.type === 'bg' ? backdropInfos : spriteInfos"
  />
  <!-- E Modal Library -->
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { ref, defineProps, computed, onMounted } from "vue";
import type { UploadFileInfo } from "naive-ui";
import { NIcon, NUpload, NButton, useMessage } from "naive-ui";
import { Add as AddIcon } from "@vicons/ionicons5";
import { commonColor } from "@/assets/theme.ts";
import type { Asset } from "@/interface/library";
// TODO: replace mock by api link
import { SpriteInfosMock } from "@/mock/library";
import { useSpriteStore } from "@/store/modules/sprite";
import { useBackdropStore } from "@/store/modules/backdrop";
import LibraryModal from "@/components/spx-library/LibraryModal.vue";
import Sprite from "@/class/sprite";
import FileWithUrl from "@/class/FileWithUrl";
import { getAssetList } from "@/api/asset"
import { AssetType } from "@/constant/constant.ts";

// ----------props & emit------------------------------------
interface propType {
  type?: string;
}
const props = defineProps<propType>();
const message = useMessage();
const spriteStore = useSpriteStore();
const backdropStore = useBackdropStore();

// ----------data related -----------------------------------
// TODO: change uploadActionUrl to real backend url.
const uploadActionUrl = "https://www.mocky.io/v2/5e4bafc63100007100d8b70f";

// Const variable about sprite categories.
const spriteCategories = [
  "ALL",
  "Animals",
  "People",
  "Sports",
  "Food",
  "Fantasy",
];

// Ref about showing modal or not.
const showModal = ref<boolean>(false);

// Ref about showing upload buttons or not.
const showUploadButtons = ref<boolean>(false);

// Ref about sprite/backdrop information.
const spriteInfos = ref<Asset[]>([]);
const backdropInfos = ref<Asset[]>([]);


// ----------computed properties-----------------------------
// Computed variable about changing css style by props.type.
const addBtnClassName = computed(() =>
  props.type === "bg" ? "bg-add-div" : "sprite-add-div"
);

// ----------lifecycle hooks---------------------------------
// onMounted hook.
onMounted(async () => {
  if (props.type === "bg") {
    backdropInfos.value = await fetchAssets(AssetType.Backdrop);
  } else {
    spriteInfos.value = await fetchAssets(AssetType.Sprite);
  }
});

// ----------methods-----------------------------------------
/**
 * @description: A function to fetch asset from backend by getAssetList.
 * @param {*} assetType
 * @Author: Xu Ning
 * @Date: 2024-01-25 23:50:45
 */
const fetchAssets = async (assetType: number) => {
  try {
    const pageIndex = 1;
    const pageSize = 20;
    const response = await getAssetList(pageIndex, pageSize, assetType);
    return response.data;
  } catch (error) {
    console.error("Error fetching assets:", error);
    return [];
  }
};

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
const openLibraryFunc = (isBg?: boolean) => {
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

.bg-add-div {
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
