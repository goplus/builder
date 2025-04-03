import { ref } from 'vue'

// 存储键名
const DEV_MODE_STORAGE_KEY = 'xb_dev_mode_enabled'

// 创建响应式状态
const isDeveloperMode = ref(false)

/**
 * 初始化开发者模式状态
 * 从 localStorage 或其他存储中读取设置
 */
export function initDeveloperMode() {
  try {
    // 从本地存储中获取设置
    const storedValue = localStorage.getItem(DEV_MODE_STORAGE_KEY)
    isDeveloperMode.value = storedValue === 'true'
    
    // 监听特定的控制台命令
    setupConsoleCommands()
  } catch (e) {
    console.error('Failed to initialize developer mode:', e)
  }
}

/**
 * 设置控制台命令来控制开发者模式
 */
function setupConsoleCommands() {
  // 在 window 对象上添加命令
  window.__xb_enable_dev_mode = () => {
    isDeveloperMode.value = true
    localStorage.setItem(DEV_MODE_STORAGE_KEY, 'true')
    console.log('✅ Developer mode enabled')
    return true
  }
  
  window.__xb_disable_dev_mode = () => {
    isDeveloperMode.value = false
    localStorage.setItem(DEV_MODE_STORAGE_KEY, 'false')
    console.log('❌ Developer mode disabled')
    return false
  }
  
  window.__xb_dev_mode_status = () => {
    console.log(`Developer mode is currently ${isDeveloperMode.value ? 'enabled' : 'disabled'}`)
    return isDeveloperMode.value
  }
}

/**
 * 检查开发者模式是否启用
 */
export function useDeveloperMode() {
  return {
    isDeveloperMode
  }
}

// 为 TypeScript 添加全局类型定义
declare global {
  interface Window {
    __xb_enable_dev_mode: () => boolean
    __xb_disable_dev_mode: () => boolean
    __xb_dev_mode_status: () => boolean
  }
}