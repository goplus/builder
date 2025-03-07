<script setup lang="ts">
import MaskWithHighlight from '../common/MaskWithHighlight.vue'
import { useTag } from '@/utils/tagging'
const { getElement, logTree } = useTag()
import { ref } from 'vue'
const path = ref('')
const visible = ref(false)
const inputRef = ref<HTMLElement | null>(null)
</script>

<template>
  <div class="tagging-and-mask">
    <h3>测试Tagging和Mask的组件，提交前请删除</h3>
    <div class="options">
      <input ref="inputRef" v-model="path" type="text" placeholder="在此输入需要测试的path路径" />
      <button
        @click="
          () => {
            const element = getElement(path)
            console.log(element)
          }
        "
      >
        Log targetElement
      </button>
      <button
        @click="
          () => {
            logTree()
          }
        "
      >
        Log Tree
      </button>
      <button
        @click="
          () => {
            if (path) {
              visible = !visible
            } else {
              inputRef?.focus()
            }
          }
        "
      >
        Toggle Mask
      </button>
    </div>
  </div>
  <MaskWithHighlight :highlight-element-path="path" :visible="visible" />
</template>

<style scoped>
.tagging-and-mask {
  background: white;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  z-index: 100000;
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
}

input {
  font-size: small;
}

.options {
  display: flex;
  gap: 8px;
}
</style>
