import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

/**
 * Create paired MCP transports for client and server
 * Factory function instead of singleton
 * 
 * @returns Object containing client and server transport instances
 */
export function createMcpTransports(): { 
  clientTransport: Transport, 
  serverTransport: Transport 
} {
  const transportPair = InMemoryTransport.createLinkedPair()
  return {
    clientTransport: transportPair[0],
    serverTransport: transportPair[1]
  }
}
