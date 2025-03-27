<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import highlight from 'highlight.js'
import { useSlotText } from '@/utils/vnode'
import 'highlight.js/styles/github.css' // 可以选择其他样式
import CodeView from './CodeView.vue'
import { UIIcon } from '@/components/ui'

const props = defineProps<{
  code?: string
  language?: string
  title?: string
  collapsed?: boolean
}>()

const { t } = useI18n()
const copySuccess = ref(false)
const copyTimeout = ref<number | null>(null)
const codeRef = ref<HTMLElement | null>(null)
const isCollapsed = ref(props.collapsed ?? false)

const slotCode = useSlotText()
const codeText = computed(() => props.code || slotCode.value)
const displayTitle = computed(() => props.title || props.language || t({ en: 'Code', zh: '代码' }))


// 处理代码高亮
onMounted(() => {
  if (codeRef.value) {
    highlight.highlightElement(codeRef.value)
  }
})

// 清理定时器
onBeforeUnmount(() => {
  if (copyTimeout.value) {
    clearTimeout(copyTimeout.value)
  }
})

// 复制代码
function handleCopy(event: MouseEvent) {
  event.stopPropagation()
  // 清除之前的超时
  if (copyTimeout.value) {
    clearTimeout(copyTimeout.value)
  }
  
  // 复制文本到剪贴板
  navigator.clipboard.writeText(codeText.value)
    .then(() => {
      copySuccess.value = true
      
      // 3秒后重置状态
      copyTimeout.value = window.setTimeout(() => {
        copySuccess.value = false
      }, 3000)
    })
    .catch((error) => {
      console.error('Failed to copy code:', error)
    })
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>


<template>
    <div class="collapsible-code-block" :class="{ 'is-collapsed': isCollapsed }">
      <div class="code-header" @click="toggleCollapse">
        <div class="header-left">
          <span class="collapse-icon">
            <span class="tool-icon custom-icon">{{ isCollapsed ? '▼' : '▶' }}</span>
          </span>
          <span class="title">{{ displayTitle }}</span>
          <span v-if="language" class="language-badge">{{ language }}</span>
        </div>
        
        <div class="header-right">
          <button class="copy-button" @click.stop="handleCopy($event)">
            <span v-if="copySuccess" class="success-text">
              {{ t({ en: 'Copied!', zh: '已复制!' }) }}
            </span>
            <span v-else>
              <UIIcon type="copy" :size="14" />
              {{ t({ en: 'Copy', zh: '复制' }) }}
            </span>
          </button>
        </div>
      </div>
      
      <transition name="slide">
        <div v-show="!isCollapsed" class="code-content">
          <CodeView class="code" :language="language" mode="block" line-numbers>{{ codeText }}</CodeView>
        </div>
      </transition>
    </div>
  </template>


<style lang="scss" scoped>
.collapsible-code-block {
  border: 1px solid var(--ui-color-grey-200, #e9ecef);
  border-radius: 6px;
  margin: 16px 0;
  background-color: var(--ui-color-grey-50, #f8f9fa);
  overflow: hidden;
  
  &.is-collapsed {
    .code-header {
      border-bottom: none;
    }
  }
  
  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1px 5px;
    background-color: var(--ui-color-grey-100, #f1f3f5);
    border-bottom: 1px solid var(--ui-color-grey-200, #e9ecef);
    cursor: pointer;
    user-select: none;
    
    &:hover {
      background-color: var(--ui-color-grey-150, #ebedef);
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .collapse-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        color: var(--ui-color-grey-600, #868e96);
      }
      
      .title {
        font-weight: 500;
        font-size: 13px;
        color: var(--ui-color-grey-800, #343a40);
      }
      
      .language-badge {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        background-color: var(--ui-color-grey-200, #e9ecef);
        color: var(--ui-color-grey-700, #495057);
        font-family: var(--ui-font-family-code, monospace);
        text-transform: lowercase;
      }
    }
    
    .header-right {
      display: flex;
      align-items: center;
      
      .copy-button {
        display: flex;
        align-items: center;
        gap: 4px;
        background: transparent;
        border: none;
        font-size: 12px;
        padding: 4px 8px;
        cursor: pointer;
        color: var(--ui-color-grey-600, #868e96);
        border-radius: 4px;
        
        &:hover {
          background-color: var(--ui-color-grey-200, #e9ecef);
          color: var(--ui-color-grey-800, #343a40);
        }
        
        .success-text {
          color: var(--ui-color-green-600, #37b24d);
        }
      }
    }
  }
  
  .code-content {
    overflow: hidden;
  }
  
  // 滑动动画
  .slide-enter-active,
  .slide-leave-active {
    transition: all 0.3s ease;
    max-height: 1000px; // 足够大的高度以容纳代码
    opacity: 1;
  }
  
  .slide-enter-from,
  .slide-leave-to {
    max-height: 0;
    opacity: 0;
  }
}

/* 移动设备适配 */
@media (max-width: 768px) {
  .collapsible-code-block {
    .code-header {
      padding: 8px 12px;
      
      .header-left {
        gap: 6px;
        
        .title {
          font-size: 12px;
        }
        
        .language-badge {
          font-size: 10px;
          padding: 1px 4px;
        }
      }
    }
  }
}
</style>