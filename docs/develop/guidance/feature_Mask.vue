<script setup lang="ts">
import { ref } from "vue";
import { Tagging } from "./module_Tagging";
import { IMask } from "./module_Mask";

const isVisible = ref(false);
const highlightStyle = ref({});

/** show mask and make target element hightlight */
const show = (key: string) => {
  const tagging = new Tagging(key);
  const element = tagging.getElement();

  if (element) {
    const rect = element.getBoundingClientRect();
    highlightStyle.value = {
      top: `${rect.top - 5}px`,
      left: `${rect.left - 5}px`,
      width: `${rect.width + 10}px`,
      height: `${rect.height + 10}px`,
    };
    isVisible.value = true;
  }
};

/** hidden mask and reset highlight style */
const hide = () => {
  isVisible.value = false;
  highlightStyle.value = {};
};

defineExpose<IMask>({
  show,
  hide,
});
</script>

<template>
  <div v-if="isVisible" class="mask-container">
    <div class="mask"></div>
    <div class="highlight-box" :style="highlightStyle" />
  </div>
</template>

<style scoped>
.mask-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
}

.highlight-box {
  position: absolute;
  background: transparent;
  box-shadow: 0 0 10px 5px rgba(255, 255, 0, 0.8);
  border-radius: 5px;
  pointer-events: auto;
}
</style>
