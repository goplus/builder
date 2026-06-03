<template>
  <UIModal
    v-bind="attrs"
    :visible="visible"
    :auto-focus="autoFocus"
    :mask-closable="maskClosable"
    @update:visible="handleUpdateVisible"
  >
    <div class="ui-form-modal">
      <header class="ui-form-modal-header">
        <div class="ui-form-modal-title" :class="{ centered: centerTitle }">
          {{ title }}
        </div>
        <UIModalClose class="ui-form-modal-close" @click="handleCloseButton" />
      </header>
      <div class="ui-form-modal-divider"></div>
      <div class="ui-form-modal-body" :class="bodyClass">
        <slot></slot>
      </div>
    </div>
  </UIModal>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

import UIModal from './UIModal.vue'
import UIModalClose from './UIModalClose.vue'

defineOptions({
  inheritAttrs: false
})

withDefaults(
  defineProps<{
    title: string
    visible?: boolean
    autoFocus?: boolean
    maskClosable?: boolean
    centerTitle?: boolean
    bodyClass?: string
  }>(),
  {
    visible: false,
    autoFocus: true,
    maskClosable: true,
    centerTitle: false,
    bodyClass: undefined
  }
)

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const attrs = useAttrs()

function handleUpdateVisible(visible: boolean) {
  emit('update:visible', visible)
}

function handleCloseButton() {
  handleUpdateVisible(false)
}
</script>

<style scoped>
.ui-form-modal {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
}

.ui-form-modal-header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 8px 24px;
}

.ui-form-modal-title {
  flex: 1;
  color: var(--ui-color-title);
  font-size: var(--ui-font-size-xl);
  line-height: 28px;
}

.ui-form-modal-title.centered {
  padding-left: 28px;
  text-align: center;
}

.ui-form-modal-close {
  margin-right: -4px;
}

.ui-form-modal-divider {
  height: 1px;
  flex: none;
  background: var(--ui-color-grey-400);
}

.ui-form-modal-body {
  padding: 20px 24px 24px;
}
</style>
