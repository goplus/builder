<template>
  <UIBlockItem color="primary" size="large">
    <div class="img-container">
      <UIImg class="img" :src="imgSrc" />
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
  imgSrc: string
  name: string
  selected: boolean
}>()
</script>
<style scoped lang="scss">
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
