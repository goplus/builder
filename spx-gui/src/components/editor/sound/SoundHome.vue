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
      <SoundsEdit :asset="selectedSound" />
    </n-layout-content>
  </n-layout>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { NLayout, NLayoutContent, NLayoutSider } from 'naive-ui'
import { Sound } from '@/models/sound'
import AssetAddBtn from '@/components/editor/panels/todo/AssetAddBtn.vue' // TODO: review this dependency
import { useEditorCtx } from '@/components/editor/ProjectEditor.vue'
import { AssetType } from '@/apis/asset'
import SoundsEditCard from './SoundEditCard.vue'
import SoundsEdit from './SoundEdit.vue'

const editorCtx = useEditorCtx()
const selectedSound = ref<Sound>()

watch(
  () => editorCtx.project,
  () => {
    selectedSound.value = editorCtx.project.sounds[0]
  }
)

const handleSelect = (asset: Sound) => {
  selectedSound.value = asset
}

const handleRemoveSound = (sound: Sound) => {
  editorCtx.project.removeSound(sound.name)
}
</script>

<style scoped lang="scss"></style>
