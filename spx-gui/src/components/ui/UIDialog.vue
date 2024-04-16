<template>
  <UIModal>
    <div class="container">
      <div class="icon">
        <img :src="iconMap[type]" alt="icon" />
      </div>
      <div>
        <div class="title">
          {{ title }}
        </div>
        <slot></slot>
      </div>
    </div>
  </UIModal>
</template>

<script setup lang="ts">
import UIModal from './UIModal.vue'
import errorSvg from './dialog-icons/error.svg'
import warningSvg from './dialog-icons/warning.svg'
import infoSvg from './dialog-icons/info.svg'
import successSvg from './dialog-icons/success.svg'

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

.title {
  font-size: 16px;
  font-weight: 500;
  padding-bottom: 8px;
}

.main {
  display: flex;
  flex-direction: column;
}

.container {
  padding: 20px 24px;
  display: flex;
  gap: 12px;
}
</style>
