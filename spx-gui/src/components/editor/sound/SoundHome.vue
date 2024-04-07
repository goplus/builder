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
      <AssetAddBtn :type="AssetType.Sound" />
      <SoundsEditCard
        v-for="asset in editorCtx.project.sounds"
        :key="asset.name"
        :asset="asset"
        @click="handleSelect(asset)"
        @remove="handleRemoveSound(asset)"
      />
    </n-layout-sider>
    <n-layout-content>
      <SoundsEdit :asset="selectedSound" @set-name="handleSoundFileNameUpdate" />
    </n-layout-content>
  </n-layout>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { type MessageApi, NLayout, NLayoutContent, NLayoutSider, useMessage } from 'naive-ui'
import { Sound } from '@/models/sound'
import AssetAddBtn from '@/components/editor/panels/todo/AssetAddBtn.vue' // TODO: review this dependency
import { checkUpdatedName } from '@/utils/asset'
import { useEditorCtx } from '@/components/editor/ProjectEditor.vue'
import { AssetType } from '@/apis/asset'
import SoundsEditCard from './SoundEditCard.vue'
import SoundsEdit from './SoundEdit.vue'

const message: MessageApi = useMessage()
const editorCtx = useEditorCtx()
const selectedSound = ref<Sound>()

watch(
  () => editorCtx.project,
  () => {
    selectedSound.value = editorCtx.project.sounds[0]
  }
)

const { t } = useI18n({
  inheritLocale: true
})

const handleSelect = (asset: Sound) => {
  selectedSound.value = asset
}

const handleSoundFileNameUpdate = (newName: string) => {
  if (selectedSound.value && newName.trim() !== '') {
    try {
      const checkInfo = checkUpdatedName(newName, editorCtx.project, selectedSound.value.name)
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

const handleRemoveSound = (sound: Sound) => {
  editorCtx.project.removeSound(sound.name)
}
</script>

<style scoped lang="scss"></style>
