<template>
  <UIBlockItem class="ui-sprite-item" color="primary" size="large" :active="selected">
    <div class="img-container">
      <UIImg class="img" no-cover :src="imgSrc" :loading="imgLoading" />
    </div>
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
  padding: 4px 0;
}
.img-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.img {
  height: 99px;
  width: 99px;
}
</style>
