/**
 * MCP Server implementation for SPX Builder
 * Handles tool registration, request processing, and server-side operations
 * @module server
 */
import { ref } from 'vue'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { serverTransport, setServerConnected } from './transport'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { CreateProjectArgsSchema, createProject } from './operations/project'
import { RunGameArgsSchema, runGame } from './operations/game'
import { AddSpriteFromCanvosArgsSchema, addSpriteFromCanvos } from './operations/sprite'
import { InsertCodeArgsSchema, insertCode } from './operations/code'
import { z } from 'zod'
import { ToolSchema } from '@modelcontextprotocol/sdk/types.js'

const ToolInputSchema = ToolSchema.shape.inputSchema
type ToolInput = z.infer<typeof ToolInputSchema>

/**
 * MCP Server instance configuration
 * Provides tool execution capabilities for SPX Builder
 *
 * @constant
 * @type {Server}
 */
const server = new Server(
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

export const tools = [
  {
    name: 'create_project',
    description:
      'Create a new SPX language project for Go+ XBuilder with the specified name and initialize default project structure.',
    inputSchema: zodToJsonSchema(CreateProjectArgsSchema) as ToolInput
  },
  {
    name: 'run_game',
    description: 'Run the current Go+ XBuilder SPX project in the XBuilder environment.',
    inputSchema: zodToJsonSchema(RunGameArgsSchema) as ToolInput
  },
  {
    name: 'add_sprite_from_canvos',
    description: 'Add a new visual sprite or component from the canvos to the current Go+ XBuilder project workspace.',
    inputSchema: zodToJsonSchema(AddSpriteFromCanvosArgsSchema) as ToolInput
  },
  {
    name: 'insert_code',
    description:
      'Insert or replace SPX language code at specific locations in project files within the Go+ XBuilder environment.',
    inputSchema: zodToJsonSchema(InsertCodeArgsSchema) as ToolInput
  }
]

/**
 * Handler for listing available tools
 * Returns the list of registered tools and their configurations
 *
 * @async
 * @returns {Promise<{tools: Array<Tool>}>} List of available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools
  }
})

/**
 * Handler for tool execution requests
 * Processes tool calls and returns the execution results
 *
 * @async
 * @param {Object} request - The tool execution request
 * @param {string} request.params.name - The name of the tool to execute
 * @param {Object} request.params.arguments - The parameters for the tool
 * @returns {Promise<{content: Array<{type: string, text: string}>}>} Execution result
 * @throws {Error} When tool execution fails or validation fails
 */
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
    switch (name) {
      case 'create_project': {
        const args = CreateProjectArgsSchema.safeParse(parameters)
        if (!args.success) {
          throw new Error(`Invalid arguments for create_project: ${args.error}`)
        }
        const result = await createProject(args.data)
        const response = JSON.stringify(result, null, 2)
        mcpRequestHistory.value[0].response = response
        return {
          content: [{ type: 'text', text: response }]
        }
      }
      case 'run_game': {
        const args = RunGameArgsSchema.safeParse(parameters)
        if (!args.success) {
          throw new Error(`Invalid arguments for run_game: ${args.error}`)
        }
        const result = await runGame(args.data)
        const response = JSON.stringify(result, null, 2)
        mcpRequestHistory.value[0].response = response
        return {
          content: [{ type: 'text', text: response }]
        }
      }

      case 'add_sprite_from_canvos': {
        const args = AddSpriteFromCanvosArgsSchema.safeParse(parameters)
        if (!args.success) {
          throw new Error(`Invalid arguments for add_sprite: ${args.error}`)
        }
        const result = await addSpriteFromCanvos(args.data)
        const response = JSON.stringify(result, null, 2)
        mcpRequestHistory.value[0].response = response
        return {
          content: [{ type: 'text', text: response }]
        }
      }

      case 'insert_code': {
        const args = InsertCodeArgsSchema.safeParse(parameters)
        if (!args.success) {
          throw new Error(`Invalid arguments for insert_code: ${args.error}`)
        }
        const result = await insertCode(args.data)
        const response = JSON.stringify(result, null, 2)
        mcpRequestHistory.value[0].response = response
        return {
          content: [{ type: 'text', text: response }]
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error: any) {
    const errorMessage = `Unknown tool: ${name}`
    // Update request history with error
    mcpRequestHistory.value[0].response = errorMessage
    mcpRequestHistory.value[0].error = true
    throw new Error(errorMessage)
  }
})

/**
 * Initialize the MCP server connection
 * Updates the connection status and logs the result
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When connection fails
 */
server
  .connect(serverTransport)
  .then(() => {
    setServerConnected(true)
  })
  .catch((error) => {
    console.error('MCP Server connection failed:', error)
    setServerConnected(false)
  })
