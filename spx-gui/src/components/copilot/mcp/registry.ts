import { ref, reactive, watch } from 'vue'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { ToolSchema } from '@modelcontextprotocol/sdk/types.js'

const ToolInputSchema = ToolSchema.shape.inputSchema
type ToolInput = z.infer<typeof ToolInputSchema>

/**
 * 工具描述接口
 */
export interface ToolDescription {
  name: string
  description: string
  inputSchema: ToolInput
  category?: string
}

/**
 * 工具实现接口
 */
export interface ToolImplementation<T = any, R = any> {
  validate: (args: any) => T
  execute: (args: T) => Promise<R>
}

/**
 * 工具注册信息
 */
export interface RegisteredTool {
  description: ToolDescription
  implementation: ToolImplementation
  provider: string // 提供此工具的组件/模块名
}

// 工具注册表
const registry = reactive<Record<string, RegisteredTool>>({})

// 注册的工具列表 (提供给 ListTools 请求)
export const registeredTools = ref<ToolDescription[]>([])

// 监听注册表变化并更新工具列表
watch(
  registry,
  () => {
    registeredTools.value = Object.values(registry).map(t => t.description)
  },
  { deep: true }
)

/**
 * 注册工具实现
 * 
 * @param tool 工具描述
 * @param implementation 工具实现
 * @param provider 提供者标识
 * @returns 注销函数
 */
export function registerTool<T = any, R = any>(
  tool: ToolDescription, 
  implementation: ToolImplementation<T, R>,
  provider: string
): void {
  const toolName = tool.name
  
  console.error(`Registering tool "${toolName}" from provider "${provider}"`)
  
  // 检查是否已存在相同工具
  if (registry[toolName] && registry[toolName].provider !== provider) {
    console.warn(
      `Tool "${toolName}" already registered by provider "${registry[toolName].provider}". ` +
      `Overriding with implementation from "${provider}".`
    )
  }
  
  // 注册工具
  registry[toolName] = {
    description: tool,
    implementation,
    provider
  }
}


/**
 * 批量注册工具
 * 
 * @param tools 工具列表
 * @param provider 提供者标识
 * @returns 批量注销函数
 */
export function registerTools(
  tools: Array<{
    description: ToolDescription,
    implementation: ToolImplementation
  }>,
  provider: string
) {
  // 注册所有工具并收集注销函数
  tools.map(({ description, implementation }) => 
    registerTool(description, implementation, provider)
  )
}


/**
 * 注销工具
 * 
 * @param toolName 工具名称
 * @param provider 提供者标识（可选，如提供则仅在提供者匹配时注销）
 * @returns 是否成功注销
 */
export function unregisterTool(toolName: string, provider?: string): boolean {
  // 如果工具不存在，返回 false
  if (!registry[toolName]) {
    return false
  }
  
  // 如果指定了提供者，则只有当提供者匹配时才注销
  if (provider && registry[toolName].provider !== provider) {
    console.warn(`Tool "${toolName}" is registered by "${registry[toolName].provider}", not "${provider}", skipping unregister`)
    return false
  }
  
  // 记录日志
  console.error(`Unregistering tool "${toolName}"${provider ? ` from provider "${provider}"` : ''}`)
  
  // 注销工具
  delete registry[toolName]
  return true
}


/**
 * 批量注销特定提供者的所有工具
 * 
 * @param provider 提供者标识
 * @returns 注销的工具数量
 */
export function unregisterProviderTools(provider: string): number {
  let count = 0
  
  // 获取该提供者注册的所有工具
  Object.entries(registry).forEach(([toolName, tool]) => {
    if (tool.provider === provider) {
      delete registry[toolName]
      count++
    }
  })
  
  if (count > 0) {
    console.log(`Unregistered ${count} tools from provider "${provider}"`)
  }
  
  return count
}

/**
 * 根据名称获取工具实现
 * 
 * @param name 工具名
 * @returns 工具实现或undefined
 */
export function getToolImplementation(name: string): ToolImplementation | undefined {
  return registry[name]?.implementation
}

/**
 * 创建工具描述辅助函数
 * 
 * @param name 工具名
 * @param description 描述
 * @param schema zod验证模式
 * @param category 类别（可选）
 * @returns 工具描述对象
 */
export function createToolDescription<T extends z.ZodType>(
  name: string, 
  description: string, 
  schema: T,
  category?: string
): ToolDescription {
  return {
    name,
    description,
    inputSchema: zodToJsonSchema(schema) as ToolInput,
    category
  }
}

/**
 * 检查工具是否已注册
 * 
 * @param name 工具名称
 * @returns 是否已注册
 */
export function isToolRegistered(name: string): boolean {
  return !!registry[name]
}

/**
 * 获取所有已注册工具的名称
 * 
 * @returns 工具名称数组
 */
export function getRegisteredToolNames(): string[] {
  return Object.keys(registry)
}

/**
 * 执行已注册的工具
 * 
 * @param name 工具名称
 * @param args 工具参数
 * @returns 执行结果
 * @throws 如果工具未注册或执行失败
 */
export async function executeRegisteredTool(name: string, args: any): Promise<any> {
  const tool = registry[name]
  
  if (!tool) {
    throw new Error(`Tool "${name}" not registered`)
  }
  
  try {
    // 验证参数
    const validatedArgs = tool.implementation.validate(args)
    
    // 执行工具
    return await tool.implementation.execute(validatedArgs)
  } catch (error) {
    console.error(`Error executing tool "${name}":`, error)
    throw error
  }
}