import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {clientTransport, setClientConnected} from "./transport";

const client = new Client(
    {
        name: "xbuilder-action",
        version: "1.0.0"
    },
    {
        capabilities: {
        prompts: {},
        resources: {},
        tools: {}
        }
    }
);

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