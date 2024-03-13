<!--
 * @Author: Yao xinyue
 * @Date: 2024-01-22 11:17:08
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-29 14:48:52
 * @FilePath: /builder/spx-gui/src/components/spx-editor/SpxEditor.vue
 * @Description:
-->
<template>
  <n-tabs v-model:value="currentTab" type="card" animated>
    <!--Tab Code Part-->
    <n-tab-pane name="code">
      <template #tab>
        <div v-if="currentTab === 'code'" class="tab-container">
          <n-icon>
            <CodeIcon />
          </n-icon>
          <div class="tab-font-check">{{ $t('tab.code') }}</div>
        </div>
        <div v-else class="tab-container">
          <n-icon>
            <CodeIcon />
          </n-icon>
          <div class="tab-font-uncheck">{{ $t('tab.code') }}</div>
        </div>
      </template>
      <!-- TODO Code Editor Part   -->
      <SpxEditorHome />
    </n-tab-pane>
    <!--Tab Sound Part-->
    <n-tab-pane name="sound">
      <template #tab>
        <div v-if="currentTab === 'sound'" class="tab-container">
          <n-icon>
            <MusicIcon />
          </n-icon>
          <div class="tab-font-check">{{ $t('tab.sound') }}</div>
        </div>
        <div v-else class="tab-container">
          <n-icon>
            <MusicIcon />
          </n-icon>
          <div class="tab-font-uncheck">{{ $t('tab.sound') }}</div>
        </div>
      </template>
      <!--  S Component SoundsEditHome-->
      <SoundsEditHome />
      <!--  E Component SoundsEditHome-->
    </n-tab-pane>
    <!-- Tab Costume Part -->
    <!--Tab Code Part-->
    <n-tab-pane name="costume">
      <template #tab>
        <div v-if="currentTab === 'costume'" class="tab-container">
          <n-icon>
            <CostumeIcon />
          </n-icon>
          <div class="tab-font-check">{{ $t('tab.costume') }}</div>
        </div>
        <div v-else class="tab-container">
          <n-icon>
            <CostumeIcon />
          </n-icon>
          <div class="tab-font-uncheck">{{ $t('tab.costume') }}</div>
        </div>
      </template>
      <!-- TODO Costume Editor Part   -->
    </n-tab-pane>
  </n-tabs>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NTabs, NTabPane, NIcon } from 'naive-ui'
import { HighlightOutlined as CostumeIcon } from '@vicons/antd'
import { CodeSlash as CodeIcon, MusicalNotes as MusicIcon } from '@vicons/ionicons5'
import SoundsEditHome from 'comps/sounds/SoundHome.vue'
import SpxEditorHome from '@/components/spx-code-editor/CodeEditorHome.vue'

const currentTab = ref('code')
</script>

<style scoped lang="scss">
@import '@/assets/theme.scss';

.tab-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  .n-icon {
    margin: 0 5px 0 0;
  }
}

.tab-font-uncheck {
  // font-size: 20px;
  color: $spx-editor-tab-font-uncheck;
}

.tab-font-check {
  // font-size: 20px;
  color: $spx-editor-tab-font-check;
}

.tab-icon {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}
</style>
