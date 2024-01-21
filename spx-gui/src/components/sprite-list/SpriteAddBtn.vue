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
        action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f"
        @before-upload="beforeUpload"
      >
        <n-button v-if="props.type =='bg'" color="#fff" quaternary size="tiny" text-color="#fff"> Upload </n-button>
        <n-button v-else color="#fff" :text-color="commonColor"> Upload </n-button>
      </n-upload>
      
      <n-button v-if="props.type == 'bg'" color="#fff" quaternary size="tiny" @click="openLibraryFunc" text-color="#fff">
        Choose
      </n-button>
      <n-button v-else color="#fff" @click="openLibraryFunc" :text-color="commonColor">
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
    :spriteInfos="spriteInfos"
  />
  <!-- E Modal Library -->
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { ref, defineProps, computed } from "vue";
import type { UploadFileInfo } from "naive-ui";
import { NIcon, NUpload, NButton, useMessage } from "naive-ui";
import { Add as AddIcon } from "@vicons/ionicons5";
import { commonColor } from "@/assets/theme.ts";
import type { SpriteInfoType } from "@/interface/library";
// TODO: replace mock by api link
import { SpriteInfosMock } from "@/mock/library";
import LibraryModal from "@/components/spx-library/LibraryModal.vue";

// ----------props & emit------------------------------------
interface propType {
  type?: string;
}
const props = defineProps<propType>();
const message = useMessage();

// ----------data related -----------------------------------
// Ref about sprite information
const spriteInfos = ref<SpriteInfoType[]>(SpriteInfosMock);

// Const variable about sprite categories
const spriteCategories = [
  "ALL",
  "Animals",
  "People",
  "Sports",
  "Food",
  "Fantasy",
];

// Ref about showing modal or not
const showModal = ref<boolean>(false);

// Ref about showing upload buttons or not
const showUploadButtons = ref<boolean>(false);

// ----------computed properties-----------------------------
// Computed variable about changing css style by props.type
const addBtnClassName = computed(() =>
  props.type === "bg" ? "bg-add-div" : "sprite-add-div"
);

// ----------methods-----------------------------------------
/**
 * @description: A Function about clicking add button to change button style
 * @Author: Xu Ning
 * @Date: 2024-01-18 20:31:00
 */
const handleAddButtonClick = () => {
  showUploadButtons.value = !showUploadButtons.value;
};

/**
 * @description: A Function about opening library modal
 * @Author: Xu Ning
 * @Date: 2024-01-16 11:53:40
 */
const openLibraryFunc = () => {
  showModal.value = true;
};

/**
 * @description: A Function about checking the file before it upload
 * @Author: Xu Ning
 * @Date: 2024-01-18 20:36:25
 */
const beforeUpload = (data: {
  file: UploadFileInfo;
  fileList: UploadFileInfo[];
}) => {
  if (data.file.file?.type !== "image/png") {
    message.error("only support for png, please try again");
    return false;
  }
  return true;
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
