import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ref } from 'vue';

/**
 * Create a pair of linked transports for MCP communication
 * @type {[InMemoryTransport, InMemoryTransport]}
 */
const transportPair = InMemoryTransport.createLinkedPair();

/**
 * Transport instance for the MCP client
 * @type {InMemoryTransport}
 */
export const clientTransport: InMemoryTransport = transportPair[0];

/**
 * Transport instance for the MCP server
 * @type {InMemoryTransport}
 */
export const serverTransport: InMemoryTransport = transportPair[1];

/**
 * Object containing reactive connection status for both client and server
 * @type {Object}
 * @property {Ref<boolean>} client - Client connection status
 * @property {Ref<boolean>} server - Server connection status
 */
export const mcpConnectionStatus = {
  client: ref(false),
  server: ref(false),
};

/**
 * Updates the client connection status
 * @param {boolean} status - The new connection status
 */
export function setClientConnected(status: boolean) {
  mcpConnectionStatus.client.value = status;
}

/**
 * Updates the server connection status
 * @param {boolean} status - The new connection status
 */
export function setServerConnected(status: boolean) {
  mcpConnectionStatus.server.value = status;
}