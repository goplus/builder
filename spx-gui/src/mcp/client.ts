/**
 * MCP Client implementation for XBuilder
 * @module client
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { clientTransport, setClientConnected } from "./transport";

/**
 * MCP Client instance configuration
 * Handles communication between XBuilder and the MCP server
 * 
 * @constant
 * @type {Client}
 */
const client = new Client(
    {
        name: "xbuilder-action",
        version: "1.0.0"
    },
    {
        capabilities: {
            prompts: {},   // Support for interactive prompts
            resources: {}, // Support for resource management
            tools: {}     // Support for tool execution
        }
    }
);

/**
 * Initialize the MCP client connection
 * Updates the connection status and logs the result
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When connection fails
 */
client.connect(clientTransport)
    .then(() => {
        console.log("MCP Client connected successfully");
        setClientConnected(true);
    })
    .catch(error => {
        console.error("MCP Client connection failed:", error);
        setClientConnected(false);
    });

export { client };