import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

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
 * Initialize the MCP client
 * Creates client instance and establishes connection
 * 
 * @param {boolean} [force=false] - Force reinitialization even if already initialized
 * @returns {Promise<Client>} Connected MCP client instance
 * @throws {Error} If connection fails
 */
export async function createMcpClient(transport: Transport): Promise<Client> {  
  // Create new client instance with configuration
  const client = new Client(CLIENT_CONFIG.client, CLIENT_CONFIG.options)
  
  // Establish connection to transport layer
  await client.connect(transport)
  
  return client
}
