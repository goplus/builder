<!--
 * @Author: Xu Ning
 * @Date: 2024-01-17 18:11:17
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-02-19 23:42:33
 * @FilePath: /spx-gui/src/components/sprite-list/SpriteList.vue
 * @Description: 
-->
<template>
  <div class="asset-library">
    <div class="asset-library-edit-button">{{ $t('component.edit') }}</div>
    <n-grid cols="4" item-responsive responsive="screen">
      <!-- S Layout Sprite List -->
      <n-grid-item class="asset-library-left" span="3">
        <!-- S Component SpriteEditBtn -->
        <SpriteEditBtn />
        <!-- E Component SpriteEditBtn -->
        <div class="sprite-list-card">
          <n-flex>
            <!-- S Component Add Button -->
            <AssetAddBtn :type="'sprite'" />
            <!-- E Component Add Button type second step -->
            <!-- S Component ImageCardCom -->
            <ImageCardCom v-for="asset in spriteAssets" :key="asset.name" :type="'sprite'" :asset="asset"
              :style="getImageCardStyle(asset.name)" @click="toggleCodeById(asset.name)" />
            <!-- E Component ImageCardCom -->
          </n-flex>
        </div>
      </n-grid-item>
      <!-- E Layout Sprite List -->
      <!-- S Layout Stage List -->
      <n-grid-item class="asset-library-right" span="1">
        <BackdropList />
      </n-grid-item>
      <!-- E Layout Stage List -->
    </n-grid>
    <n-modal v-model:show="showModal" :mask-closable="false" preset="dialog" title="Warning" size="huge"
      content="do you want to save?" positive-text="Save" negative-text="Cancel" @positive-click="onPositiveClick"
      @negative-click="onNegativeClick">
      <n-input v-model:value="fileName" type="text" placeholder="please input file name" />
      <n-upload action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f" @before-upload="beforeUpload">
        <n-button color="#fff" :text-color="commonColor"> Upload </n-button>
      </n-upload>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { type ComputedRef, computed, ref} from "vue";
import { NGrid, NGridItem, NFlex, NModal, NUpload, NInput, type UploadFileInfo, useMessage } from 'naive-ui'
import { useSpriteStore } from '@/store/modules/sprite';
import BackdropList from "@/components/sprite-list/BackdropList.vue";
import SpriteEditBtn from "@/components/sprite-list/SpriteEditBtn.vue";
import ImageCardCom from "@/components/sprite-list/ImageCardCom.vue";
import AssetAddBtn from "@/components/sprite-list/AssetAddBtn.vue";
import { Sprite } from "@/class/sprite";
import { watchEffect } from "vue";
import { commonColor } from '@/assets/theme'
import FileWithUrl from '@/class/file-with-url'

// ----------props & emit------------------------------------
const currentActiveName = ref('');
const spriteStore = useSpriteStore();
const { setCurrentByName } = spriteStore;
const message = useMessage();
const undef = "Undefined*";

// ----------computed properties-----------------------------
// Computed spriteAssets from spriteStore.
const spriteAssets: ComputedRef<Sprite[]> = computed(
  () => spriteStore.list as Sprite[],
);

// ----------methods-----------------------------------------
/**
 * @description: A function to toggle code.
 * @param {*} name - asset name
 * @Author: Xu Ning
 * @Date: 2024-02-01 10:51:23
 */
const showModal = ref(false);
const negativeSpriteName = ref("");
const toggleCodeById = (name: string) => {
    negativeSpriteName.value = name;
    console.log('name',name)
    if (spriteStore.current.name == undef && name != undef) {
        showModal.value = true;
        return;
    }
    currentActiveName.value = name;
    setCurrentByName(name);
};

const fileName = ref("");
const beforeUpload = (data: {
    file: UploadFileInfo;
    fileList: UploadFileInfo[];
}) => {
    let uploadFile = data.file;
    if (uploadFile.file) {
        const fileURL = URL.createObjectURL(uploadFile.file);
        const fileWithUrl = new FileWithUrl(uploadFile.file, fileURL);
        // create undefined sprite
        const sprite = new Sprite(fileName.value, [fileWithUrl], spriteStore.current?.code);
        spriteStore.addItem(sprite);
        spriteStore.removeItemByName(undef);
    } else {
        message.error("Invalid or non-existent uploaded files");
        return false;
    }
    return true;
};

function onNegativeClick() {
    showModal.value = false;
    setCurrentByName(negativeSpriteName.value);
    message.success("Cancel");
}
function onPositiveClick() {
    showModal.value = false;
    setCurrentByName(negativeSpriteName.value);
    message.success("Save success");
}

const getImageCardStyle = (name: string) => {
  return name === currentActiveName.value
    ? { marginBottom: '26px', boxShadow: '0px 0px 0px 4px #FF81A7' }
    : { marginBottom: '26px' };
};

watchEffect(() => {
  if (spriteStore.current) {
    currentActiveName.value = spriteStore.current.name;
  } else {
    currentActiveName.value = '';
  }
})
</script>

<style scoped lang="scss">
@import "@/assets/theme.scss";

.asset-library {
  // TODO: Delete the background, it is just for check the position.
  // background:#f0f0f0;
  height: calc(60vh - 60px - 24px - 24px);
  border: 2px solid #00142970;
  position: relative;
  background: white;
  border-radius: 24px;
  margin: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .asset-library-edit-button {
    background: rgba(255, 170, 0, 0.5);
    width: 80px;
    height: auto;
    text-align: center;
    position: absolute;
    top: -2px;
    left: 8px;
    font-size: 18px;
    border: 2px solid #00142970;
    border-radius: 0 0 10px 10px;
    z-index: 0;
  }

  .asset-library-right {
    max-height: calc(60vh - 60px - 24px);
    overflow: scroll;
  }

  .asset-library-left {
    margin-top: 30px;
    max-height: calc(60vh - 60px - 24px - 40px);
    overflow: scroll;
    padding: 10px;
  }
}
</style>

<style lang="scss">
@import "@/assets/theme.scss";

// ! no scoped, it will change global style
.n-card {
  width: 80vw;
  border-radius: 25px;

  .n-card-header {
    border-radius: 25px 25px 0 0;
    background: $asset-library-card-title-1;
    text-align: center;
  }

  .n-card__content {
    padding: 0 !important;
  }
}
</style>
