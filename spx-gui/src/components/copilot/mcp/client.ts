import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { clientTransport, setClientConnected } from './transport'

/**
 * Flag indicating if the client has been initialized
 * Prevents redundant initialization
 */
let isInitialized = false

/**
 * Promise tracking current connection attempt
 * Used to prevent multiple concurrent connection attempts
 */
let connectionPromise: Promise<void> | null = null

/**
 * Client configuration
 * Defines client metadata and capabilities
 */
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

/**
 * Active client instance
 * Singleton reference to the MCP client
 */
let client: Client | null = null

/**
 * Initialize the MCP client
 * Creates client instance and establishes connection
 * 
 * @param {boolean} [force=false] - Force reinitialization even if already initialized
 * @returns {Promise<Client>} Connected MCP client instance
 * @throws {Error} If connection fails
 */
export async function initMcpClient(force = false): Promise<Client> {
  // Return existing client if already initialized and not forced
  if (isInitialized && client && !force) {
    return client
  }
  
  // If connection is in progress, wait for it to complete
  if (connectionPromise && !force) {
    return connectionPromise.then(() => {
      if (!client) throw new Error('Client initialization failed')
      return client
    })
  }
  
  // Create new client instance with configuration
  client = new Client(CLIENT_CONFIG.client, CLIENT_CONFIG.options)
  
  // Establish connection to transport layer
  connectionPromise = client
    .connect(clientTransport)
    .then(() => {
      isInitialized = true
      setClientConnected(true)
    })
    .catch((error) => {
      console.error('MCP Client connection failed:', error)
      setClientConnected(false)
      throw error 
    })
    .finally(() => {
      connectionPromise = null
    })
  
  // Wait for connection to complete
  await connectionPromise
  
  return client
}

/**
 * Get the initialized MCP client
 * 
 * @returns {Client} The active MCP client instance
 * @throws {Error} If client is not initialized
 */
export function getMcpClient(): Client {
  if (!client || !isInitialized) {
    throw new Error('MCP Client not initialized. Call initMcpClient() first.')
  }
  return client
}