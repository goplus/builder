import { reactive, ref, watch } from 'vue'
import { getMcpClient } from './client'

export type TaskStatus = 'pending' | 'running' | 'success' | 'error'

/**
 * 工具任务信息
 */
export interface ToolTask {
  id: string         // 任务ID
  tool: string       // 工具名称
  server?: string    // 服务器名称
  args: string       // 原始参数字符串
  status: TaskStatus // 任务状态
  result?: any       // 执行结果
  errorMessage?: string // 错误信息
  timestamp?: number    // 执行时间戳
}

/**
 * 工具结果接口
 */
export interface ToolResult {
  id: string        // 工具ID
  tool: string      // 工具名称
  server?: string   // 服务器名称
  result: any       // 执行结果
  timestamp: number // 执行时间戳
}

export class ToolResultCollector {
  // 使用 reactive 来管理任务状态，确保组件可以直接使用
  private tasks = reactive<Record<string, ToolTask>>({})
  private executionQueue = ref<string[]>([])
  private isProcessing = ref(false)
  private resultCallback: ((results: ToolResult[]) => void) | null = null
  
  // 存储的任务结果
  private results: ToolResult[] = []
  
  constructor(private options = { 
    debounceTime: 500,
    storagePrefix: 'mcp_tool_'
  }) {}
  
  /**
   * 获取或创建工具任务
   */
  getOrCreateTask(taskInfo: Omit<ToolTask, 'status'>): ToolTask {
    const id = taskInfo.id
    
    // 如果任务已存在，返回它
    if (this.tasks[id]) {
      return this.tasks[id]
    }
    
    // 从存储中恢复任务
    const storedTask = this.getStoredTask(id)
    
    // 创建新任务
    this.tasks[id] = {
      id,
      tool: taskInfo.tool,
      server: taskInfo.server,
      args: taskInfo.args,
      status: storedTask?.status || 'pending',
      result: storedTask?.result,
      errorMessage: storedTask?.errorMessage,
      timestamp: storedTask?.timestamp
    }
    
    return this.tasks[id]
  }
  
  /**
   * 执行工具任务
   */
  executeTask(taskId: string): void {
    // 检查任务是否存在
    if (!this.tasks[taskId]) {
      console.error(`Task ${taskId} not found`)
      return
    }
    
    // 如果任务已在执行或已在队列中，返回
    if (this.tasks[taskId].status === 'running' || 
        this.executionQueue.value.includes(taskId)) {
      return
    }
    
    // 更新任务状态
    this.tasks[taskId].status = 'pending'
    this.saveTaskToStorage(taskId)
    
    // 添加到执行队列
    this.executionQueue.value.push(taskId)
  }
  
  /**
   * 标记任务为错误状态
   */
  markTaskError(taskId: string, errorMessage: string): void {
    if (!this.tasks[taskId]) {
      console.error(`Task ${taskId} not found`)
      return
    }
    
    this.tasks[taskId].status = 'error'
    this.tasks[taskId].errorMessage = errorMessage
    this.saveTaskToStorage(taskId)
    
    // 通知任务完成
    this.submitTaskResult(taskId, { error: errorMessage })
  }

  clearAllTasks(): void {
    // 停止当前处理
    this.isProcessing.value = false
    
    // 清空队列
    this.executionQueue.value = []
    
    // 获取所有任务ID
    const taskIds = Object.keys(this.tasks)
    
    // 清空结果
    this.results = []
    
    // 清空任务和存储
    for (const id of taskIds) {
      // 从存储中删除
      try {
        const key = `${this.options.storagePrefix}${id}`
        sessionStorage.removeItem(key)
      } catch (e) {
        console.error(`Error removing task ${id} from storage:`, e)
      }
      
      // 从任务集合中删除
      delete this.tasks[id]
    }
  }
  
  /**
   * 注册结果处理回调
   */
  onResultsReady(callback: (results: ToolResult[]) => void): void {
    this.resultCallback = callback
    
    // 检查是否有待处理的结果
    this.processPendingResults()
  }
  
  /**
   * 提交任务结果
   */
  private submitTaskResult(taskId: string, result: any): void {
    const task = this.tasks[taskId]
    if (!task) return
    
    // 添加到结果列表
    this.results.push({
      id: task.id,
      tool: task.tool,
      server: task.server,
      result: result,
      timestamp: Date.now()
    })
    
    // 处理结果
    this.processPendingResults()
  }
  
  /**
   * 处理待处理的结果
   */
  private processPendingResults(): void {
    if (!this.resultCallback || this.results.length === 0) {
      return
    }
    
    // 检查所有任务是否已完成
    const pendingTasks = Object.values(this.tasks).filter(
      task => task.status === 'pending' || task.status === 'running'
    )
    
    // 如果还有正在执行的任务，等待
    if (pendingTasks.length > 0) {
      return
    }
    
    // 复制结果并清空
    const results = [...this.results]
    this.results = []
    
    // 调用回调
    setTimeout(() => {
      try {
        this.resultCallback!(results)
      } catch (error) {
        console.error('Error in result callback:', error)
      }
    }, this.options.debounceTime)
  }
  
  /**
   * 处理执行队列
   */
  async processQueue(): Promise<void> {
    // 如果已在处理或队列为空，返回
    if (this.isProcessing.value || this.executionQueue.value.length === 0) {
      return
    }
    
    this.isProcessing.value = true
    
    try {
      while (this.executionQueue.value.length > 0) {
        // 取出队首任务
        const taskId = this.executionQueue.value.shift()!
        const task = this.tasks[taskId]
        
        if (!task) {
          console.error(`Task ${taskId} not found in queue`)
          continue
        }
        
        // 更新任务状态为运行中
        task.status = 'running'
        this.saveTaskToStorage(taskId)
        
        try {
          // 解析参数
          const args = JSON.parse(task.args)
          
          // 调用 MCP 工具
          const result = await getMcpClient().callTool({
            name: task.tool,
            arguments: args
          })
          
          // 更新任务状态
          task.status = 'success'
          task.result = result
          task.errorMessage = undefined
          task.timestamp = Date.now()
          this.saveTaskToStorage(taskId)
          
          // 提交结果
          this.submitTaskResult(taskId, result)
        } catch (error) {
          // 处理错误
          task.status = 'error'
          task.errorMessage = error instanceof Error ? error.message : String(error)
          task.timestamp = Date.now()
          this.saveTaskToStorage(taskId)
          
          // 提交错误结果
          this.submitTaskResult(taskId, { error: task.errorMessage })
        }
      }
    } finally {
      this.isProcessing.value = false
    }
  }
  
  /**
   * 从存储获取任务
   */
  private getStoredTask(taskId: string): Partial<ToolTask> | null {
    try {
      const key = `${this.options.storagePrefix}${taskId}`
      const stored = sessionStorage.getItem(key)
      
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error(`Error restoring task ${taskId}:`, e)
    }
    
    return null
  }
  
  /**
   * 保存任务到存储
   */
  private saveTaskToStorage(taskId: string): void {
    const task = this.tasks[taskId]
    if (!task) return
    
    try {
      const key = `${this.options.storagePrefix}${taskId}`
      sessionStorage.setItem(key, JSON.stringify({
        status: task.status,
        result: task.result,
        errorMessage: task.errorMessage,
        timestamp: task.timestamp || Date.now()
      }))
    } catch (e) {
      console.error(`Error saving task ${taskId}:`, e)
    }
  }
}

// 导出单例
export const toolResultCollector = new ToolResultCollector()