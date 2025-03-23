<template>
  <div class="coding-dialog">
    <div class="title">
      <slot name="title"></slot>
    </div>
    <div class="content" :style="{ height: props.contentHeight }">
      <slot name="content"></slot>
    </div>
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{
  contentHeight: string
}>()
</script>
<style scoped lang="scss">
.coding-dialog {
  width: 230px;
  border-radius: 10px;
  background-color: #fff;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
  padding: 15px;
  .title {
    width: 200px;
    height: 30px;
  }
  .content {
    width: 200px;
    overflow: auto;
  }
}
</style>
