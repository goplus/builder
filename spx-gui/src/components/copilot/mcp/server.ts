import { ref } from 'vue'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { serverTransport, setServerConnected } from './transport'
import { registeredTools, executeRegisteredTool } from './registry'

// 连接状态管理
let isServerInitialized = false
let serverConnectionPromise: Promise<void> | null = null
let server: Server | null = null

/**
 * Interface for request history items
 */
export interface RequestHistoryItem {
  tool: string
  params: any
  response: string
  time: string
  error?: boolean
}

/**
 * Reactive request history store
 */
export const mcpRequestHistory = ref<RequestHistoryItem[]>([])

/**
 * 初始化 MCP 服务器
 * 创建服务器实例，注册请求处理器并建立连接
 * 
 * @async
 * @param {boolean} [force=false] - 是否强制重新初始化
 * @returns {Promise<Server>} MCP 服务器实例
 * @throws {Error} 连接失败时抛出错误
 */
export async function initMcpServer(force = false): Promise<Server> {
  // 如果已初始化且不是强制模式，返回现有服务器
  if (isServerInitialized && server && !force) {
    return server
  }
  
  // 如果当前有连接进行中，直接返回该 Promise
  if (serverConnectionPromise && !force) {
    return serverConnectionPromise.then(() => {
      if (!server) throw new Error('Server initialization failed')
      return server
    })
  }
  
  // 创建服务器实例
  server = new Server(
    {
      name: 'spx',
      version: '0.1.0'
    },
    {
      capabilities: {
        tools: {} // Tool execution capability
      }
    }
  )
  
  // 注册工具列表请求处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: registeredTools.value
    }
  })
  
  // 注册工具执行请求处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const timestamp = new Date().toLocaleTimeString()
  
    // Record the request
    mcpRequestHistory.value.unshift({
      tool: request.params.name,
      params: request.params.arguments,
      response: 'Pending...',
      time: timestamp
    })
  
    try {
      const { name, arguments: parameters } = request.params
      
      // 执行已注册的工具
      const result = await executeRegisteredTool(name, parameters)
      
      // 格式化响应
      const response = JSON.stringify(result, null, 2)
      
      // 更新请求历史
      mcpRequestHistory.value[0].response = response
      
      return {
        content: [{ type: 'text', text: response }]
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred while processing the request'
      // Update request history with error
      mcpRequestHistory.value[0].response = errorMessage
      mcpRequestHistory.value[0].error = true
      throw new Error(errorMessage)
    }
  })
  
  // 连接到 MCP 服务器传输层
  serverConnectionPromise = server
    .connect(serverTransport)
    .then(() => {
      isServerInitialized = true
      setServerConnected(true)
    })
    .catch((error) => {
      console.error('MCP Server connection failed:', error)
      setServerConnected(false)
      throw error
    })
    .finally(() => {
      serverConnectionPromise = null
    })
  
  // 等待连接完成
  await serverConnectionPromise
  
  return server
}