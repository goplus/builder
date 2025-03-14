<template>
  <div v-if="visible" class="dialog-overlay">
    <div class="dialog-container">
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <span v-if="loading" class="loading-icon">🔄</span>
      </div>

      <div class="dialog-content">
        <slot v-if="!isCode">{{ content }}</slot>
        <pre v-if="isCode" class="code-block">{{ code }}</pre>
      </div>

      <div class="dialog-footer">
        <slot name="footer">
          <UIButton v-if="button !== ''" :class="buttonClass" @click="handleButtonClick">
            {{ button }}
          </UIButton>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UIButton from '../ui/UIButton.vue'

const emit = defineEmits(['next', 'retry', 'answer', 'close'])

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  code: { type: String, default: '' },
  isCode: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  button: { type: String, default: '' },
  buttonAction: { type: String, default: '' }
})

const buttonClass = computed(() => {
  return props.buttonAction.toLowerCase() + '-button'
})

const handleButtonClick = () => {
  const validActions = ['next', 'retry', 'answer', 'close']
  const action = props.buttonAction.toLowerCase()
  if (validActions.includes(action)) {
    emit(action as 'next' | 'retry' | 'answer' | 'close')
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-container {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  width: 400px;
  padding: 20px;
  text-align: center;
}

.dialog-header {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}

.loading-icon {
  font-size: 16px;
  color: orange;
  margin-left: 5px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.dialog-content {
  font-size: 14px;
  color: #333;
  margin-bottom: 20px;
  white-space: pre-wrap;
  text-align: left;
}

.code-block {
  background-color: #f7f7f7;
  font-family: monospace;
  padding: 10px;
  border-radius: 8px;
  color: #333;
  overflow: auto;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>
