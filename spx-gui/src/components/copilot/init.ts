import { ref, readonly, type App } from 'vue'
import { Copilot } from './copilot'
import { CopilotController } from './index'
import { initMcpClient } from './mcp/client'
import { initMcpServer } from './mcp/server'
import { useI18n } from '@/utils/i18n'

// Copilot Chat 可见性状态
const isCopilotChatVisible = ref(false)

// 延迟初始化标志
let isInitialized = false
let copilot: Copilot | null = null
let controller: CopilotController | null = null

/**
 * 初始化 Copilot 模块
 * 包括 Copilot 实例、Controller、MCP 客户端和服务器
 */
export async function initCopilot() {
  if (isInitialized) return controller
  
  try {
    // 同步初始化 Copilot
    const i18n = useI18n()
    copilot = new Copilot(i18n)
    controller = new CopilotController(copilot)
    controller.init()
    
    // 异步初始化 MCP （不阻塞主流程）
    initMcpConnections().catch(error => {
      console.error('Failed to initialize MCP connections:', error)
    })
    
    isInitialized = true
    
    return controller
  } catch (error) {
    console.error('Failed to initialize Copilot module:', error)
    throw error
  }
}

/**
 * 初始化 MCP 连接
 * 分离为独立函数以便异步处理
 */
async function initMcpConnections() {
  try {
    // 并行初始化客户端和服务器
    await Promise.all([
      initMcpClient(),
      initMcpServer()
    ])
  } catch (error) {
    console.error('MCP initialization error:', error)
    throw error
  }
}

/**
 * 提供 Copilot 功能的 Vue 插件
 */
export const createCopilot = {
  async install(app: App) {
    const controller = await initCopilot()
    
    // 注册全局属性和方法
    app.provide('copilotController', controller)
  }
}

/**
 * 获取 Copilot 聊天控制功能
 */
export function useCopilotChat() {
  if (!isInitialized) {
    initCopilot()
  }
  
  return {
    isVisible: readonly(isCopilotChatVisible),
    toggle: () => {
      isCopilotChatVisible.value = !isCopilotChatVisible.value
      return isCopilotChatVisible.value
    },
    open: () => { isCopilotChatVisible.value = true },
    close: () => { isCopilotChatVisible.value = false }
  }
}