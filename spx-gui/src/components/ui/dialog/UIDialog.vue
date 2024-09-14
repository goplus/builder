<template>
  <UIModal>
    <div class="container">
      <div class="icon">
        <img :src="iconMap[type]" alt="icon" />
      </div>
      <div class="main">
        <div class="title">
          {{ title }}
        </div>
        <slot></slot>
      </div>
    </div>
  </UIModal>
</template>

<script setup lang="ts">
import UIModal from '../modal/UIModal.vue'
import errorSvg from './icons/error.svg'
import warningSvg from './icons/warning.svg'
import infoSvg from './icons/info.svg'
import successSvg from './icons/success.svg'

defineProps<{
  title: string
  type: 'info' | 'warning' | 'error' | 'success'
}>()

const iconMap = {
  info: infoSvg,
  warning: warningSvg,
  error: errorSvg,
  success: successSvg
}
</script>
<style scoped lang="scss">
.icon {
  width: 24px;
  height: 24px;
}

.main {
  flex: 1 1 0;
}

.title {
  font-size: 16px;
  line-height: 26px;
  color: var(--ui-color-title);
  margin-bottom: 8px;
}

.main {
  display: flex;
  flex-direction: column;
}

.container {
  padding: 20px 24px 24px;
  display: flex;
  gap: 12px;
}
</style>
