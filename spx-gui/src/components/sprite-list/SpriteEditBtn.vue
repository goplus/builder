<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:09:35
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-07 22:38:29
 * @FilePath: /builder/spx-gui/src/components/sprite-list/SpriteEditBtn.vue
 * @Description: 
-->
<template>
  <n-flex justify="space-around">
    <div class="sprite-edit-btn">
      <p> {{ $t('stage.direction') }}</p>
      <n-input round autosize clearable :default-value="name"></n-input>
    </div>
    <div class="sprite-edit-btn">
      <p>X</p>
      <n-input-number
        style="border-radius: 25px"
        class="edit-input"
        round
        autosize
        clearable
        type="number"
        :value="x"
        :disabled="!spriteStore.current"
        @update:value="
          (val) => {
            spriteStore.current && spriteStore.current.setSx(val as number)
          }
        "
      ></n-input-number>
    </div>
    <div class="sprite-edit-btn">
      <p>Y</p>
      <n-input-number
        type="number"
        :value="y"
        :disabled="!spriteStore.current"
        @update:value="
          (val) => {
            spriteStore.current && spriteStore.current.setSy(val as number)
          }
        "
      />
    </div>
    <div class="sprite-edit-btn">
      <p>{{ $t('stage.show') }}</p>
      <n-switch
        v-model:value="visible"
        @update:value="
          (val) => {
            spriteStore.current && spriteStore.current.setVisible(val)
          }
        "
      />
    </div>
    <div class="sprite-edit-btn">
      <p>{{ $t('stage.size') }}</p>
      <n-input-number
        type="number"
        :min="0"
        :value="size * 100"
        :disabled="!spriteStore.current"
        @update:value="
          (val) => {
            spriteStore.current && spriteStore.current.setSize((val as number) / 100)
          }
        "
      ></n-input-number>
    </div>

    <div class="sprite-edit-btn">
      <p> {{ $t('stage.direction') }}</p>
      <n-input-number
        type="number"
        :min="-180"
        :max="180"
        :value="heading"
        :disabled="!spriteStore.current"
        @update:value="
          (val) => {
            spriteStore.current && spriteStore.current.setHeading(val as number)
          }
        "
      ></n-input-number>
    </div>
  </n-flex>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { ref, computed } from 'vue'
import { NInput, NInputNumber, NFlex, NSwitch } from 'naive-ui'
import { useSpriteStore } from '@/store/modules/sprite'

// ----------props & emit------------------------------------
const spriteStore = useSpriteStore()

// ----------data related -----------------------------------

const x = computed(() => (spriteStore.current ? spriteStore.current.config.x : 0))
const y = computed(() => (spriteStore.current ? spriteStore.current.config.y : 0))
const heading = computed(() => (spriteStore.current ? spriteStore.current.config.heading : 0))
const size = computed(() => (spriteStore.current ? spriteStore.current.config.size : 0))
const visible = computed(() => (spriteStore.current ? spriteStore.current.config.visible : false))
const name = computed(() => (spriteStore.current ? spriteStore.current.config.name : 0))
</script>

<style scoped lang="scss">
.sprite-edit-btn {
  flex: 1;
  display: flex;
  margin: 2px;
  min-width: 100px;
  p {
    margin: 0;
    line-height: 2rem;
  }
  .n-input,
  .n-input-number,
  .n-switch {
    margin-left: 3px;
    min-width: 70%;
  }
  .n-switch {
    min-width:70%;
  }
  .n-input-number {
    max-width: 100px;
  }
}
</style>
