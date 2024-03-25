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
      style="width: 175px; background-image: linear-gradient(to bottom, #fefbfb, #fbe8eb)"
    >
      <AssetAddBtn :style="{ 'margin-bottom': '26px' }" :type="AssetType.Sound" />
      <SoundsEditCard
        v-for="asset in projectStore.project.sounds"
        :key="asset.name"
        :asset="asset"
        :style="{ 'margin-bottom': '26px' }"
        @click="handleSelect(asset)"
        @delete-sound="handleDeleteSound(asset)"
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
import SoundsEditCard from '@/components/sounds/SoundEditCard.vue'
import { type MessageApi, NLayout, NLayoutContent, NLayoutSider, useMessage } from 'naive-ui'
import SoundsEdit from '@/components/sounds/SoundEdit.vue'
import { ref, watch } from 'vue'
import { Sound } from '@/models/sound'
import AssetAddBtn from '@/components/sprite-list/AssetAddBtn.vue'
import { checkUpdatedName } from '@/util/asset'
import { useProjectStore } from '@/store'
import { useI18n } from 'vue-i18n'
import type { File } from '@/models/common/file'
import { AssetType } from '@/api/asset'

const message: MessageApi = useMessage()
const projectStore = useProjectStore()
const selectedSound = ref<Sound>()

watch(
  () => projectStore.project,
  () => {
    selectedSound.value = projectStore.project.sounds[0]
  }
)

const { t } = useI18n({
  inheritLocale: true
})

const handleSelect = (asset: Sound) => {
  selectedSound.value = asset
}

const handleSoundFileUpdate = (newFile: File) => {
  if (selectedSound.value) {
    selectedSound.value.setFile(newFile)
    message.success(t('message.save'), { duration: 1000 })
  }
}

const handleSoundFileNameUpdate = (newName: string) => {
  if (selectedSound.value && newName.trim() !== '') {
    try {
      const checkInfo = checkUpdatedName(
        newName,
        useProjectStore().project,
        selectedSound.value.name
      )
      if (!checkInfo.isSame && !checkInfo.isChanged) {
        selectedSound.value.name = checkInfo.name
        message.success(t('message.update'))
      }
      if (checkInfo.msg) message.warning(checkInfo.msg)
    } catch (e) {
      if (e instanceof Error) message.error(e.message)
    }
  }
}

const handleDeleteSound = (sound: Sound) => {
  projectStore.project.removeSound(sound.name)
}
</script>

<style scoped lang="scss"></style>
