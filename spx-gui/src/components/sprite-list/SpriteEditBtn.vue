<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:09:35
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-18 23:10:14
 * @FilePath: /spx-gui-front-private/src/components/sprite-list/SpriteEditBtn.vue
 * @Description: 
-->
<template>
  <n-flex justify="space-around">
    <div class="sprite-edit-btn">
      Sprite
      <n-input round autosize clearable default-value="Monkey"></n-input>
    </div>
    <div class="sprite-edit-btn">
      X
      <n-input round autosize clearable default-value="50"></n-input>
    </div>
    <div class="sprite-edit-btn">
      Y
      <n-input round autosize clearable default-value="60"></n-input>
    </div>
    <div class="sprite-edit-btn">
      Show
      <n-switch v-model:value="isSpriteShow" />
    </div>
    <div class="sprite-edit-btn">
      Size
      <n-input round autosize clearable default-value="50"></n-input>
    </div>
    <div class="sprite-edit-btn">
      Direction
      <n-input round autosize clearable default-value="60"></n-input>
    </div>
  </n-flex>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineEmits, ref } from "vue";
import { NInput, NFlex, NSwitch } from "naive-ui";

// ----------props & emit------------------------------------
const emits = defineEmits(["update:isSpriteShow"]);

// ----------data related -----------------------------------
// Ref about show sprite state
const isSpriteShow = ref<boolean>(true)
</script>

<style scoped lang="scss">
.sprite-edit-btn {
  display: inline;
  margin: 5px;
}
</style>
