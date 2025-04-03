import { ref } from 'vue'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { serverTransport, setServerConnected } from './transport'
import { registeredTools, executeRegisteredTool } from './registry'

/**
 * Server connection state
 * Tracks initialization and connection status
 */
let isServerInitialized = false
let serverConnectionPromise: Promise<void> | null = null
let server: Server | null = null

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
 * Reactive request history store
 * Contains chronological list of tool invocations
 */
export const mcpRequestHistory = ref<RequestHistoryItem[]>([])

/**
 * Initialize the MCP server
 * Creates server instance, registers request handlers and establishes connection
 * 
 * @param {boolean} [force=false] - Force reinitialization even if already initialized
 * @returns {Promise<Server>} MCP server instance
 * @throws {Error} If connection fails
 */
export async function initMcpServer(force = false): Promise<Server> {
  // Return existing server if already initialized and not forced
  if (isServerInitialized && server && !force) {
    return server
  }
  
  // If connection is in progress, wait for it to complete
  if (serverConnectionPromise && !force) {
    return serverConnectionPromise.then(() => {
      if (!server) throw new Error('Server initialization failed')
      return server
    })
  }
  
  // Create new server instance with metadata
  server = new Server(
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
      tools: registeredTools.value
    }
  })
  
  // Register handler for tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const timestamp = new Date().toLocaleTimeString()
  
    // Record the request in history
    mcpRequestHistory.value.unshift({
      tool: request.params.name,
      params: request.params.arguments,
      response: 'Pending...',
      time: timestamp
    })
  
    try {
      const { name, arguments: parameters } = request.params
      
      // Execute registered tool implementation
      const result = await executeRegisteredTool(name, parameters)
      
      // Format response for display
      const response = JSON.stringify(result, null, 2)
      
      // Update request history with success result
      mcpRequestHistory.value[0].response = response
      
      // Return formatted response
      return {
        content: [{ type: 'text', text: response }]
      }
    } catch (error: any) {
      // Format error message
      const errorMessage = error.message || 'An error occurred while processing the request'
      
      // Update request history with error information
      mcpRequestHistory.value[0].response = errorMessage
      mcpRequestHistory.value[0].error = true
      
      // Propagate error to client
      throw new Error(errorMessage)
    }
  })
  
  // Establish connection to transport layer
  serverConnectionPromise = server
    .connect(serverTransport)
    .then(() => {
      // Mark initialization as complete
      isServerInitialized = true
      setServerConnected(true)
    })
    .catch((error) => {
      console.error('MCP Server connection failed:', error)
      setServerConnected(false)
      throw error
    })
    .finally(() => {
      // Clear connection promise when done
      serverConnectionPromise = null
    })
  
  // Wait for connection to complete
  await serverConnectionPromise
  
  return server
}