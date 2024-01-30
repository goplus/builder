<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:09:35
<<<<<<< HEAD
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-29 15:31:20
 * @FilePath: /builder/spx-gui/src/components/sprite-list/SpriteEditBtn.vue
=======
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-26 16:46:15
 * @FilePath: /spx-gui/src/components/sprite-list/SpriteEditBtn.vue
>>>>>>> upstreamDev
 * @Description: 
-->
<template>
  <n-flex justify="space-around">

    <div class="sprite-edit-btn">
      X
      <n-input-number round autosize clearable type="number" :value="x" :disabled="!spriteStore.current"
        @update:value="(val) => { spriteStore.current && spriteStore.current.setSx(val as number) }"></n-input-number>
    </div>
    <div class="sprite-edit-btn">
      Y
      <n-input-number type="number" :value="y" :disabled="!spriteStore.current"
        @update:value="(val) => { spriteStore.current && spriteStore.current.setSy(val as number) }" />
    </div>
    <div class="sprite-edit-btn">
      Size
      <n-input-number type="number" :min="0" :value="size*100" :disabled="!spriteStore.current"
        @update:value="(val) => { spriteStore.current && spriteStore.current.setSize(val as number / 100) }"></n-input-number>
    </div>
  </n-flex>
  <n-flex justify="space-around">
    <div class="sprite-edit-btn">
      Sprite
      <n-input  round autosize clearable default-value="Monkey"></n-input>
    </div>
    <div class="sprite-edit-btn">
      X
      <n-input-number style="border-radius:25px;" class="edit-input" round autosize clearable type="number" :value="x"  :disabled="!spriteStore.current"
        @update:value="(val) => { spriteStore.current && spriteStore.current.setSx(val as number) }"></n-input-number>
    </div>
    <div class="sprite-edit-btn">
      Y
      <n-input-number type="number" :value="y" :disabled="!spriteStore.current"
        @update:value="(val) => { spriteStore.current && spriteStore.current.setSy(val as number) }" />
    </div>
    <div class="sprite-edit-btn">
      Show
      <n-switch v-model:value="isSpriteShow" />
    </div>
    <div class="sprite-edit-btn">
      Size
      <n-input-number type="number" :min="0" :value="size*100" :disabled="!spriteStore.current"
        @update:value="(val) => { spriteStore.current && spriteStore.current.setSize(val as number / 100) }"></n-input-number>
    </div>
    
    <div class="sprite-edit-btn">
      Dir
      <n-input-number type="number" :min="-180" :max="180" :value="heading" :disabled="!spriteStore.current"
        @update:value="(val) => { spriteStore.current && spriteStore.current.setHeading(val as number) }"></n-input-number>
    </div>
  </n-flex>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineEmits, ref, computed } from "vue";
import { NInput, NInputNumber, NFlex, NSwitch } from "naive-ui";
import { useSpriteStore } from "@/store/modules/sprite";

// ----------props & emit------------------------------------
const emits = defineEmits(["update:isSpriteShow"]);
const spriteStore = useSpriteStore()

// ----------data related -----------------------------------
// Ref about show sprite state
const isSpriteShow = ref<boolean>(true)

const x = computed(() => spriteStore.current ? spriteStore.current.config.x : 0)
const y = computed(() => spriteStore.current ? spriteStore.current.config.y : 0)
const heading = computed(() => spriteStore.current ? spriteStore.current.config.heading : 0)
const size = computed(() => spriteStore.current ? spriteStore.current.config.size : 0)
</script>

<style scoped lang="scss">
.sprite-edit-btn {
  flex: 1;
  display: flex;
<<<<<<< HEAD
  margin: 2px;
  .n-input, .n-input-number, .n-switch{
    margin-left:3px;
  }
  .n-input-number{
    max-width:100px;
=======
  margin: 5px;

  .n-input-number {
    border-radius: 25px;
>>>>>>> upstreamDev
  }
}
</style>

