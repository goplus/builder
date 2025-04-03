import { ref, reactive, watch } from 'vue'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { ToolSchema } from '@modelcontextprotocol/sdk/types.js'

const ToolInputSchema = ToolSchema.shape.inputSchema
type ToolInput = z.infer<typeof ToolInputSchema>

/**
 * Tool description interface
 * Defines the metadata for a tool that can be registered with MCP
 */
export interface ToolDescription {
  /** Unique identifier for the tool */
  name: string
  
  /** Human-readable description of the tool's functionality */
  description: string
  
  /** JSON schema for validating tool input arguments */
  inputSchema: ToolInput
  
  /** Optional category for grouping related tools */
  category?: string
}

/**
 * Tool implementation interface
 * Defines the contract for tool execution logic
 * 
 * @template T - The validated input type
 * @template R - The result type
 */
export interface ToolImplementation<T = any, R = any> {
  /**
   * Validates and transforms input arguments
   * @param args - Raw input arguments
   * @returns Validated arguments
   * @throws If validation fails
   */
  validate: (args: any) => T
  
  /**
   * Executes the tool with validated arguments
   * @param args - Validated input arguments
   * @returns Tool execution result
   */
  execute: (args: T) => Promise<R>
}

/**
 * Registered tool entry
 * Contains all information for a registered tool
 */
export interface RegisteredTool {
  /** Tool description metadata */
  description: ToolDescription
  
  /** Tool implementation logic */
  implementation: ToolImplementation
  
  /** Identifier of the component/module that provided this tool */
  provider: string
}

/**
 * Internal tool registry
 * Maps tool names to their registration information
 */
const registry = reactive<Record<string, RegisteredTool>>({})

/**
 * List of registered tool descriptions
 * Exposed for ListTools MCP request
 */
export const registeredTools = ref<ToolDescription[]>([])

/**
 * Watch registry changes and update the tool list
 * Ensures registeredTools stays synchronized with the registry
 */
watch(
  registry,
  () => {
    registeredTools.value = Object.values(registry).map(t => t.description)
  },
  { deep: true }
)

/**
 * Register a tool implementation
 * 
 * @template T - The validated input type
 * @template R - The result type
 * @param tool - Tool metadata description
 * @param implementation - Tool implementation
 * @param provider - Provider identifier
 */
export function registerTool<T = any, R = any>(
  tool: ToolDescription, 
  implementation: ToolImplementation<T, R>,
  provider: string
): void {
  const toolName = tool.name
  
  console.log(`Registering tool "${toolName}" from provider "${provider}"`)
  
  // Check for existing tool registration
  if (registry[toolName] && registry[toolName].provider !== provider) {
    console.warn(
      `Tool "${toolName}" already registered by provider "${registry[toolName].provider}". ` +
      `Overriding with implementation from "${provider}".`
    )
  }
  
  // Register the tool
  registry[toolName] = {
    description: tool,
    implementation,
    provider
  }
}

/**
 * Register multiple tools at once
 * 
 * @param tools - Array of tool descriptions and implementations
 * @param provider - Provider identifier
 */
export function registerTools(
  tools: Array<{
    description: ToolDescription,
    implementation: ToolImplementation
  }>,
  provider: string
): void {
  console.log(`Registering ${tools.length} tools from provider "${provider}"`)
  
  // Register all tools
  tools.forEach(({ description, implementation }) => 
    registerTool(description, implementation, provider)
  )
}

/**
 * Unregister a specific tool
 * 
 * @param toolName - Name of the tool to unregister
 * @param provider - Optional provider identifier for verification
 * @returns Whether unregistration was successful
 */
export function unregisterTool(toolName: string, provider?: string): boolean {
  // Check if tool exists
  if (!registry[toolName]) {
    return false
  }
  
  // If provider specified, verify it matches
  if (provider && registry[toolName].provider !== provider) {
    console.warn(`Tool "${toolName}" is registered by "${registry[toolName].provider}", not "${provider}", skipping unregister`)
    return false
  }
  
  // Log unregistration
  console.log(`Unregistering tool "${toolName}"${provider ? ` from provider "${provider}"` : ''}`)
  
  // Remove tool from registry
  delete registry[toolName]
  return true
}

/**
 * Unregister all tools from a specific provider
 * 
 * @param provider - Provider identifier
 * @returns Number of tools unregistered
 */
export function unregisterProviderTools(provider: string): number {
  let count = 0
  
  // Find and remove all tools from the provider
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
 * Get a tool implementation by name
 * 
 * @param name - Tool name
 * @returns Tool implementation or undefined if not found
 */
export function getToolImplementation(name: string): ToolImplementation | undefined {
  return registry[name]?.implementation
}

/**
 * Create a tool description with the given parameters
 * Helper function to simplify tool description creation
 * 
 * @template T - Zod schema type
 * @param name - Tool name
 * @param description - Tool description
 * @param schema - Zod validation schema
 * @param category - Optional tool category
 * @returns Tool description object
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
 * Check if a tool is registered
 * 
 * @param name - Tool name
 * @returns Whether the tool is registered
 */
export function isToolRegistered(name: string): boolean {
  return !!registry[name]
}

/**
 * Get names of all registered tools
 * 
 * @returns Array of tool names
 */
export function getRegisteredToolNames(): string[] {
  return Object.keys(registry)
}

/**
 * Execute a registered tool
 * 
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Tool execution result
 * @throws If tool is not registered or execution fails
 */
export async function executeRegisteredTool(name: string, args: any): Promise<any> {
  const tool = registry[name]
  
  if (!tool) {
    throw new Error(`Tool "${name}" not registered`)
  }
  
  try {
    // Validate arguments
    const validatedArgs = tool.implementation.validate(args)
    
    // Execute tool
    return await tool.implementation.execute(validatedArgs)
  } catch (error) {
    console.error(`Error executing tool "${name}":`, error)
    throw error
  }
}