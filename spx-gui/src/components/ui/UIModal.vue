<template>
  <NModal :to="attachTo">
    <UICard :class="['container', `size-${size || 'medium'}`]">
      <slot></slot>
    </UICard>
  </NModal>
</template>
<script setup lang="ts">
import { NModal } from 'naive-ui'
import UICard from './UICard.vue'
import { onMounted, ref } from 'vue'

export type ModalSize = 'small' | 'medium' | 'large' | 'full'
defineProps<{
  title?: string
  size?: ModalSize
}>()

const attachTo = ref<HTMLElement>()
onMounted(() => {
  // TODO:
  // 1. use Provide & inject to pass element
  // 2. use some PopupContainerProvider instead of ConfigProvider to provide element
  attachTo.value = document.getElementsByClassName('ui-config-provider')[0] as HTMLElement
})
</script>
<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
}

.size-small {
  width: 480px;
}

.size-medium {
  width: 640px;
}

.size-large {
  width: 960px;
}

.size-full {
  width: 100%;
  margin: 16px;
}

.divider {
  margin: 0;
}

.main {
  padding: 16px;
}
</style>
