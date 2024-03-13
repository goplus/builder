<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:27:57
 * @LastEditors: Yao xinyue
 * @LastEditTime: 2024-02-19 16:12:54
 * @FilePath: /builder/spx-gui/src/components/sound/SoundHome.vue
 * @Description: Sounds Homepage, includes Edit Part And Card List
-->
<template>
  <n-layout has-sider style="height: calc(100vh - 60px - 54px - 12px)">
    <n-layout-sider
      :native-scrollbar="false"
      content-style="paddingLeft: 120px;"
      style="width: 175px; background-image: linear-gradient(to bottom, #FEFBFB, #FBE8EB);"
    >
    <AssetAddBtn
        :style="{ 'margin-bottom': '26px' }"
        :type="'sound'"
      />
      <SoundsEditCard
        v-for="asset in assets"
        :key="asset.name"
        :asset="asset"
        :style="{ 'margin-bottom': '26px' }"
        @click="handleSelect(asset)"
        @delete-sound="handleDeleteSound"
      />
    </n-layout-sider>
    <n-layout-content>
      <SoundsEdit
        :asset="selectedSound"
        style="margin-left: 10px"
        @update-sound-file="handleSoundFileUpdate"
        @update-sound-name="handleSoundFileNameUpdate"
      />
    </n-layout-content>
  </n-layout>
</template>

<script lang="ts" setup>
import SoundsEditCard from "comps/sounds/SoundEditCard.vue";
import { type MessageApi, NLayout, NLayoutContent, NLayoutSider, useMessage } from 'naive-ui'
import SoundsEdit from "comps/sounds/SoundEdit.vue";
import { computed, type ComputedRef, ref } from 'vue'
import { Sound } from '@/class/sound'
import { useSoundStore } from 'store/modules/sound'
import AssetAddBtn from 'comps/sprite-list/AssetAddBtn.vue'
import { checkUpdatedName } from "@/util/asset";
import { useProjectStore } from "@/store";

const message: MessageApi = useMessage();
const soundStore = useSoundStore();
const assets: ComputedRef<Sound[]> = computed(
  () => soundStore.list as Sound[],
);
const selectedSound = ref<Sound>();

const handleSelect = (asset: Sound) => {
  selectedSound.value = asset;
};

const handleSoundFileUpdate = (newFile: File) => {
  if (selectedSound.value) {
    selectedSound.value.files[0] = newFile;
    message.success(
      'save successfully!',
      { duration: 1000 }
    );
  }
};

const handleSoundFileNameUpdate = (newName: string) => {
  if (selectedSound.value && newName.trim() !== '') {
    try {
      const checkInfo = checkUpdatedName(selectedSound.value, newName, useProjectStore().project)
      if (checkInfo.isChanged) {
        selectedSound.value.name = checkInfo.name;
        message.success('update name successfully!')
      }
      if (checkInfo.msg) message.warning(checkInfo.msg);
    } catch(e) {
      if (e instanceof Error)
        message.error(e.message);
    }
  }
};

const handleDeleteSound = (soundName : string) => {
  if (soundName) {
    soundStore.removeItemByName(soundName);
  }
};

</script>

<style scoped lang="scss">
</style>
