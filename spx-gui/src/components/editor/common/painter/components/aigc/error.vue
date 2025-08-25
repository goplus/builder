<template>
  <!-- 错误提示弹窗 -->
  <div 
    v-if="visible" 
    class="error-modal-overlay"
    @click="handleClose"
  >
    <div 
      class="error-modal-content"
      @click.stop
    >
      <div class="error-modal-header">
        <div class="error-icon">⚠️</div>
        <h3 class="error-title">{{ $t({ en: 'Generation Failed', zh: '生成失败' }) }}</h3>
        <button 
          class="error-close-btn"
          @click="handleClose"
        >
          ×
        </button>
      </div>
      
      <div class="error-modal-body">
        <p class="error-message">
          {{ errorMessage }}
        </p>
        <div class="error-suggestions">
          <h4 class="suggestions-title">{{ $t({ en: 'Suggestions:', zh: '建议：' }) }}</h4>
          <ul class="suggestions-list">
            <li v-if="errorType === 'timeout'">{{ $t({ en: 'Try simplifying your description', zh: '尝试简化您的描述' }) }}</li>
            <li v-if="errorType === 'network'">{{ $t({ en: 'Check your network connection', zh: '检查网络连接状态' }) }}</li>
            <li v-if="errorType === 'params'">{{ $t({ en: 'Ensure prompt is at least 3 characters', zh: '确保提示词至少3个字符' }) }}</li>
            <li v-if="errorType === 'default' || errorType === 'server'">{{ $t({ en: 'Try again in a few moments', zh: '稍后再试' }) }}</li>
            <li>{{ $t({ en: 'Contact support if the problem persists', zh: '如问题持续存在，请联系技术支持' }) }}</li>
          </ul>
        </div>
      </div>
      
      <div class="error-modal-footer">
        <button 
          class="btn btn-secondary"
          @click="handleClose"
        >
          {{ $t({ en: 'Close', zh: '关闭' }) }}
        </button>
        <button 
          class="btn btn-primary"
          @click="handleRetry"
        >
          {{ $t({ en: 'Retry', zh: '重试' }) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'

// Props
interface Props {
  visible: boolean
  errorType?: string
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  errorType: 'default',
})

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'close': []
  'retry': []
}>()

// 获取全局属性
const instance = getCurrentInstance()
const $t = instance?.appContext.config.globalProperties.$t

// 方法
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleRetry = () => {
  emit('update:visible', false)
  emit('retry')
}

// 错误消息计算属性
const errorMessage = computed(() => {

  
  // 如果 $t 不可用，默认返回英文
  if (!$t) {
    switch (props.errorType) {
      case 'timeout':
        return 'Generation timeout, please try simplifying the description or try again later'
      case 'network':
        return 'Network connection error, please check your network connection'
      case 'params':
        return 'Request parameter error, please check the prompt length (at least 3 characters)'
      case 'server':
        return 'Server internal error, please try again later'
      default:
        return 'Image generation failed, please try again later'
    }
  }
  console.log($t)
  console.log(props.errorType)
  // 根据错误类型返回对应的错误信息
  switch (props.errorType) {
    case 'timeout':
      return $t({ en: 'Generation timeout, please try simplifying the description or try again later', zh: '生成超时，请尝试简化描述或稍后重试' })
    case 'network':
      return $t({ en: 'Network connection error, please check your network connection', zh: '网络连接异常，请检查网络连接' })
    case 'params':
      return $t({ en: 'Request parameter error, please check the prompt length (at least 3 characters)', zh: '请求参数错误，请检查提示词长度（至少3个字符）' })
    case 'server':
      return $t({ en: 'Server internal error, please try again later', zh: '服务器内部错误，请稍后重试' })
    default:
      return $t({ en: 'Image generation failed, please try again later', zh: '图片生成失败，请稍后重试' })
  }
})
</script>

<style scoped>
/* 错误弹窗样式 */
.error-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.error-modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: errorModalSlideIn 0.3s ease-out;
  overflow: hidden;
}

@keyframes errorModalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.error-modal-header {
  display: flex;
  align-items: center;
  padding: 20px 24px 16px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-bottom: 1px solid #fecaca;
}

.error-icon {
  font-size: 24px;
  margin-right: 12px;
  filter: drop-shadow(0 2px 4px rgba(239, 68, 68, 0.2));
}

.error-title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #dc2626;
}

.error-close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #dc2626;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
  opacity: 0.7;
}

.error-close-btn:hover {
  background: rgba(220, 38, 38, 0.1);
  opacity: 1;
}

.error-modal-body {
  padding: 20px 24px;
}

.error-message {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #374151;
  line-height: 1.5;
  font-weight: 500;
}

.error-suggestions {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.suggestions-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.suggestions-list {
  margin: 0;
  padding-left: 16px;
  list-style: none;
}

.suggestions-list li {
  position: relative;
  margin-bottom: 8px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.4;
}

.suggestions-list li:before {
  content: '•';
  color: #3b82f6;
  font-weight: bold;
  position: absolute;
  left: -12px;
}

.suggestions-list li:last-child {
  margin-bottom: 0;
}

.error-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.error-modal-footer .btn {
  min-width: 80px;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-modal-content {
    max-width: 95%;
    margin: 20px;
  }
  
  .error-modal-footer {
    flex-direction: column-reverse;
  }
  
  .error-modal-footer .btn {
    width: 100%;
  }
}
</style>
