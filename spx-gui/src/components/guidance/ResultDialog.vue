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
          <button
            v-if="button !== ''"
            :class="button.toLowerCase() + '-button'"
            @click="emit(button.toLowerCase() === 'next' ? 'next' : 'retry')"
          >
            {{ button }}
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['next', 'retry'])

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  code: { type: String, default: '' },
  isCode: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  button: { type: String, default: '' }
})

defineExpose({
  visible: props.visible,
  title: props.title,
  content: props.content,
  code: props.code,
  isCode: props.isCode,
  loading: props.loading,
  button: props.button
})
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

.next-button {
  background-color: #00c4cc;
  color: white;
  font-size: 14px;
  border: none;
  border-radius: 5px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.next-button:hover {
  background-color: #00a3aa;
}

.next-button:active {
  background-color: #008a8f;
}

.retry-button {
  background-color: #cccccc;
  color: black;
  font-size: 14px;
  border: none;
  border-radius: 5px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-button:hover {
  background-color: #b3b3b3;
}

.retry-button:active {
  background-color: #999999;
}
</style>
