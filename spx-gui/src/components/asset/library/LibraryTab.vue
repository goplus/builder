<template>
  <n-tabs animated :value="value" @update:value="handleUpdateValue">
      <n-tab-pane name="0" :tab="text[0]">
      </n-tab-pane>
      <n-tab-pane name="1" :tab="text[1]">
      </n-tab-pane>
      <n-tab-pane name="2" :tab="text[2]">
      </n-tab-pane>
  </n-tabs>
</template>

<script setup lang="ts">
import { NTabPane,NTabs } from 'naive-ui';
import { useI18n } from '@/utils/i18n'
import { ref } from 'vue'
import { useSearchCtx } from './SearchContextProvider.vue'
import { AssetType } from '@/apis/asset'

const { t } = useI18n()
const searchCtx = useSearchCtx()
const type = ref<AssetType>(searchCtx.type)
const value = ref<string>(AssetType[type.value])
const text = {
  0: t({ en: 'Sprite', zh: `精灵` }),
  1: t({ en: 'Backdrop', zh: `背景` }),
  2: t({ en: 'Sound', zh: `声音` }),
}

const handleUpdateValue = (value: string) => {
  searchCtx.type = Number(value) as AssetType
  type.value = searchCtx.type
  console.log(searchCtx.type)
  //todo: 
}
</script>

<style scoped>
.card-tabs .n-tabs-nav--bar-type {
  padding-left: 4px;
}
</style>