<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:27:57
 * @LastEditors: Yao xinyue
 * @LastEditTime: 2024-02-19 16:12:54
 * @FilePath: /builder/spx-gui/src/components/sound/SoundsHome.vue
 * @Description: Sounds Homepage, includes Edit Part And Card List
-->
<template>
  <n-layout has-sider style="height: calc(100vh - 60px - 54px - 12px)">
    <n-layout-sider
      :native-scrollbar="false"
      content-style="paddingLeft: 120px;"
      style="width: 175px"
    >
      <SpriteAddBtn
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
        :key="componentKey"
        :asset="selectedSound"
        @update-sound-file="handleSoundFileUpdate"
        style="margin-left: 10px"
      />
    </n-layout-content>
  </n-layout>
</template>

<script lang="ts" setup>
import SoundsEditCard from "@/components/sounds/SoundsEditCard.vue";
import { type MessageApi, NLayout, NLayoutContent, NLayoutSider, useMessage } from 'naive-ui'
import SoundsEdit from "@/components/sounds/SoundsEdit.vue";
import { computed, type ComputedRef, ref } from 'vue'
import type { Sound } from '@/class/sound'
import { useSoundStore } from 'store/modules/sound'
import SpriteAddBtn from 'comps/sprite-list/SpriteAddBtn.vue'

const message: MessageApi = useMessage();
const soundStore = useSoundStore();
const assets: ComputedRef<Sound[]> = computed(
  () => soundStore.list as Sound[],
);
const selectedSound = ref<Sound | null>(null);
const componentKey = ref(0);

const handleSelect = (asset: Sound) => {
  selectedSound.value = asset;
  componentKey.value++; // Increment the key to force re-creation of SoundsEdit
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

const handleDeleteSound = (soundName : string) => {
  if (soundName) {
    soundStore.removeItemByName(soundName);
  }
};

</script>

<style scoped lang="scss">
</style>
