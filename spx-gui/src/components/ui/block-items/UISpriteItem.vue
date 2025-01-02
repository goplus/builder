<template>
  <UIBlockItem class="ui-sprite-item" size="large" :active="selected" :interactive="selected != null">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    <UIBlockItemTitle size="large">
      {{ name }}
    </UIBlockItemTitle>
    <UICornerIcon v-show="selected" type="check" />
  </UIBlockItem>
</template>
<script setup lang="ts">
import UIBlockItem from './UIBlockItem.vue'
import UICornerIcon from './UICornerIcon.vue'
import UIImg from '../UIImg.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'

withDefaults(
  defineProps<{
    imgSrc: string | null
    imgLoading: boolean
    name: string
    selected?: boolean
  }>(),
  {
    selected: undefined
  }
)
</script>
<style scoped lang="scss">
.ui-sprite-item {
  padding: 2px;
}
.img {
  height: 99px;
  width: 99px;
}
</style>
