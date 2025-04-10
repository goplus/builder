import { reactive, ref } from 'vue'

/** Status lifecycle of a tool task */
export type TaskStatus = 'pending' | 'running' | 'success' | 'error'

/**
 * Tool task information
 * Contains all data related to a specific tool execution
 */
export interface ToolTask {
  id: string // Unique task identifier
  tool: string // Name of the tool to execute
  server?: string // Server name (optional)
  args: string // Arguments as JSON string
  status: TaskStatus // Current execution status
  result?: any // Execution result if available
  errorMessage?: string // Error information if failed
  timestamp?: number // Execution timestamp
}

/**
 * Tool execution result
 * Contains the outcome of a tool execution
 */
export interface ToolResult {
  id: string // Task identifier
  tool: string // Name of the executed tool
  server?: string // Server name (optional)
  result: any // Execution result or error information
  timestamp: number // When the result was produced
}

/**
 * Manages the lifecycle of tool executions
 * Provides queuing, persistence, and result collection
 */
export class ToolResultCollector {
  // Reactive state for task management
  private tasks = reactive<Record<string, ToolTask>>({})
  private executionQueue = ref<string[]>([])
  private isProcessing = ref(false)
  private mcpClient: any = null

  // Collection of execution results
  private results: ToolResult[] = []

  /**
   * Creates a new collector with optional configuration
   * @param options Configuration options
   */
  constructor(
    private options = {
      debounceTime: 500,
      storagePrefix: 'mcp_tool_'
    }
  ) {}

  /**
   * Sets the MCP client for executing tasks
   * @param client The MCP client instance
   */
  setMcpClient(client: any) {
    this.mcpClient = client
  }

  /**
   * Retrieves an existing task or creates a new one
   * @param taskInfo Information for task creation
   * @returns The task object
   */
  getOrCreateTask(taskInfo: Omit<ToolTask, 'status'>): ToolTask {
    const id = taskInfo.id

    // Return existing task if available
    if (this.tasks[id]) {
      return this.tasks[id]
    }

    // Try to recover from session storage
    const storedTask = this.getStoredTask(id)

    // Create new task with restored or default values
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
   * Schedules a task for execution
   * @param taskId ID of the task to execute
   */
  executeTask(taskId: string): void {
    // Validate task existence
    if (!this.tasks[taskId]) {
      console.error(`Task ${taskId} not found`)
      return
    }

    // Skip if already running or queued
    if (this.tasks[taskId].status === 'running' || this.executionQueue.value.includes(taskId)) {
      return
    }

    // Update status and add to execution queue
    this.tasks[taskId].status = 'pending'
    this.saveTaskToStorage(taskId)
    this.executionQueue.value.push(taskId)
  }

  /**
   * Marks a task as failed with error information
   * @param taskId ID of the failed task
   * @param errorMessage Error description
   */
  markTaskError(taskId: string, errorMessage: string): void {
    if (!this.tasks[taskId]) {
      console.error(`Task ${taskId} not found`)
      return
    }

    this.tasks[taskId].status = 'error'
    this.tasks[taskId].errorMessage = errorMessage
    this.saveTaskToStorage(taskId)
  }

  /**
   * Removes all tasks and clears the execution queue
   */
  clearAllTasks(): void {
    // Stop processing
    this.isProcessing.value = false

    // Clear the execution queue
    this.executionQueue.value = []

    // Get all task IDs
    const taskIds = Object.keys(this.tasks)

    // Clear results collection
    this.results = []

    // Remove all tasks from storage and memory
    for (const id of taskIds) {
      // Remove from storage
      try {
        const key = `${this.options.storagePrefix}${id}`
        sessionStorage.removeItem(key)
      } catch (e) {
        console.error(`Error removing task ${id} from storage:`, e)
      }

      // Remove from collection
      delete this.tasks[id]
    }
  }

  /**
   * Processes all queued tasks sequentially
   * @returns Promise resolving to array of results from processed tasks
   */
  async processQueue(): Promise<ToolResult[]> {
    // Skip if already processing or queue is empty
    if (this.isProcessing.value || this.executionQueue.value.length === 0) {
      return []
    }

    this.isProcessing.value = true
    const processedResults: ToolResult[] = []
    if (this.mcpClient == null) {
      console.error('MCP client not initialized')
      return []
    }
    try {
      while (this.executionQueue.value.length > 0) {
        // Get next task from queue
        const taskId = this.executionQueue.value.shift()!
        const task = this.tasks[taskId]

        if (!task) {
          console.error(`Task ${taskId} not found in queue`)
          continue
        }

        // Set status to running
        task.status = 'running'
        this.saveTaskToStorage(taskId)

        try {
          // Parse arguments and call the tool
          const args = JSON.parse(task.args)

          const result = await this.mcpClient.callTool({
            name: task.tool,
            arguments: args
          })

          // Update task with success information
          task.status = 'success'
          task.result = result
          task.errorMessage = undefined
          task.timestamp = Date.now()
          this.saveTaskToStorage(taskId)

          // Create result object
          const toolResult: ToolResult = {
            id: task.id,
            tool: task.tool,
            server: task.server,
            result: result,
            timestamp: task.timestamp
          }

          // Store in results collections
          processedResults.push(toolResult)
          this.results.push(toolResult)
        } catch (error) {
          // Update task with error information
          task.status = 'error'
          task.errorMessage = error instanceof Error ? error.message : String(error)
          task.timestamp = Date.now()
          this.saveTaskToStorage(taskId)

          // Create error result object
          const errorResult: ToolResult = {
            id: task.id,
            tool: task.tool,
            server: task.server,
            result: { error: task.errorMessage },
            timestamp: task.timestamp
          }

          // Store in results collections
          processedResults.push(errorResult)
          this.results.push(errorResult)
        }
      }
    } finally {
      this.isProcessing.value = false
    }

    return processedResults
  }

  /**
   * Retrieves a task from session storage
   * @param taskId ID of the task to retrieve
   * @returns Partial task data or null if not found
   * @private
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
   * Persists task data to session storage
   * @param taskId ID of the task to save
   * @private
   */
  private saveTaskToStorage(taskId: string): void {
    const task = this.tasks[taskId]
    if (!task) return

    try {
      const key = `${this.options.storagePrefix}${taskId}`
      sessionStorage.setItem(
        key,
        JSON.stringify({
          status: task.status,
          result: task.result,
          errorMessage: task.errorMessage,
          timestamp: task.timestamp || Date.now()
        })
      )
    } catch (e) {
      console.error(`Error saving task ${taskId}:`, e)
    }
  }
}
