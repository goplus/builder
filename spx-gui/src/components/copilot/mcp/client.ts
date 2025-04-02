/**
 * MCP Client implementation for XBuilder
 * @module client
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { clientTransport, setClientConnected } from './transport'

let isInitialized = false
let connectionPromise: Promise<void> | null = null

const CLIENT_CONFIG = {
  client: {
    name: 'xbuilder-action',
    version: '1.0.0'
  },
  options: {
    capabilities: {
      prompts: {}, // Support for interactive prompts
      resources: {}, // Support for resource management
      tools: {} // Support for tool execution
    }
  }
}

let client: Client | null = null

export async function initMcpClient(force = false): Promise<Client> {
  // 如果已初始化且不是强制模式，返回现有客户端
  if (isInitialized && client && !force) {
    return client
  }
  
  // 如果当前有连接进行中，直接返回该 Promise
  if (connectionPromise && !force) {
    return connectionPromise.then(() => {
      if (!client) throw new Error('Client initialization failed')
      return client
    })
  }
  
  // 创建新的客户端实例
  client = new Client(CLIENT_CONFIG.client, CLIENT_CONFIG.options)
  
  // 连接到 MCP 服务器
  connectionPromise = client
    .connect(clientTransport)
    .then(() => {
      isInitialized = true
      setClientConnected(true)
    })
    .catch((error) => {
      console.error('MCP Client connection failed:', error)
      setClientConnected(false)
      throw error // 重新抛出错误以便调用者处理
    })
    .finally(() => {
      connectionPromise = null
    })
  
  // 等待连接完成
  await connectionPromise
  
  return client
}

export function getMcpClient(): Client {
  if (!client || !isInitialized) {
    throw new Error('MCP Client not initialized. Call initMcpClient() first.')
  }
  return client
}