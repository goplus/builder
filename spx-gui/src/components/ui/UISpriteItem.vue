<template>
  <UIBlockItem class="ui-sprite-item" size="large" :active="selected">
    <UIImg class="img" no-cover :src="imgSrc" :loading="imgLoading" />
    <UIBlockItemTitle size="large">
      {{ name }}
    </UIBlockItemTitle>
    <UICornerIcon v-show="selected" type="check" />
  </UIBlockItem>
</template>
<script setup lang="ts">
import UIBlockItem from './UIBlockItem.vue'
import UICornerIcon from './UICornerIcon.vue'
import UIImg from './UIImg.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'

defineProps<{
  imgSrc: string | null
  imgLoading: boolean
  name: string
  selected: boolean
}>()
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
