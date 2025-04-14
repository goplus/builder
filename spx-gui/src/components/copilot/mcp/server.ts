import { type Ref } from 'vue'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { ToolRegistry } from './registry'

/**
 * Interface for request history items
 * Tracks tool invocations and their results
 */
export interface RequestHistoryItem {
  /** Tool name that was called */
  tool: string

  /** Parameters passed to the tool */
  params: any

  /** Response or error message */
  response: string

  /** Timestamp of the request */
  time: string

  /** Whether the request resulted in an error */
  error?: boolean
}

/**
 * Interface for history management
 */
export interface HistoryManager {
  requests: Ref<RequestHistoryItem[]>
  addRequest: (item: RequestHistoryItem) => void
  updateLastResponse: (response: string, isError?: boolean) => void
  clear: () => void
}

/**
 * Context for MCP server creation
 */
export interface McpServerContext {
  history: HistoryManager
  registry: ToolRegistry
}

/**
 * Initialize the MCP server
 * Creates server instance, registers request handlers and establishes connection
 *
 * @param {Transport} transport - The transport layer to connect to
 * @param {McpServerContext} context - Context containing history and registry
 * @returns {Promise<Server>} MCP server instance
 * @throws {Error} If connection fails
 */
export async function createMcpServer(transport: Transport, context: McpServerContext): Promise<Server> {
  const { history, registry } = context
  // Create new server instance with metadata
  const server = new Server(
    {
      name: 'spx',
      version: '0.1.0'
    },
    {
      capabilities: {
        tools: {} // Enable tool execution capability
      }
    }
  )

  // Register handler for tool discovery
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: registry.tools.value
    }
  })

  // Register handler for tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const timestamp = new Date().toLocaleTimeString()

    // Record the request in history
    history.addRequest({
      tool: request.params.name,
      params: request.params.arguments,
      response: 'Pending...',
      time: timestamp
    })

    try {
      const { name, arguments: parameters } = request.params

      // Execute registered tool implementation
      const result = await registry.executeRegisteredTool(name, parameters)

      // Format response for display
      const response = JSON.stringify(result, null, 2)

      // Update request history with success result
      history.updateLastResponse(response)

      // Return formatted response
      return {
        content: [{ type: 'text', text: response }]
      }
    } catch (error: any) {
      // Format error message
      const errorMessage = error.message || 'An error occurred while processing the request'

      // Update request history with error information
      history.updateLastResponse(errorMessage, true)

      // Propagate error to client
      throw new Error(errorMessage)
    }
  })

  // Connect to the transport
  server.connect(transport).catch((error) => {
    console.error('MCP Server connection failed:', error)
  })

  return server
}
