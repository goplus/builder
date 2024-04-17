<template>
  <NModal :to="attachTo">
    <div :class="['container', `size-${size || 'medium'}`]">
      <slot></slot>
    </div>
  </NModal>
</template>
<script setup lang="ts">
import { NModal } from 'naive-ui'
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
  box-shadow: var(--ui-box-shadow-big);
  border-radius: var(--ui-border-radius-2);
  background-color: white;
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
