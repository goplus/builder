/**
 * MCP Server implementation for SPX Builder
 * Handles tool registration, request processing, and server-side operations
 * @module server
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { serverTransport, setServerConnected } from "./transport";
import {
  createProject,
  navigatePage,
  addSprite,
  insertCode,
} from "./tools";

/**
 * MCP Server instance configuration
 * Provides tool execution capabilities for SPX Builder
 * 
 * @constant
 * @type {Server}
 */
const server = new Server(
  {
    name: "spx",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {}, // Tool execution capability
    },
  }
);

/**
 * Available tools configuration
 * Defines the tools that can be called through the MCP server
 * 
 * @constant
 * @type {Array<Tool>}
 */
export const tools = [
  {
    name: "create_project",
    description: "Create a new project with the specified name.",
    parameters: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "The name of the project to be created.",
        },
      },
      required: ["projectName"],
    },
  },
  {
    name: "navigate_page",
    description: "Navigate to a specific page using the provided location URL.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The URL or path of the page to navigate to.",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "add_sprite",
    description: "Add a new sprite to the project from the specified library.",
    parameters: {
      type: "object",
      properties: {
        libraryName: {
          type: "string",
          description: "The name of the library containing the sprite.",
        },
        spriteName: {
          type: "string",
          description: "The name of the sprite to be added after selection.",
        },
      },
      required: ["libraryName", "spriteName"],
    },
  },
  {
    name: "insert_code",
    description: "Insert or replace code at a specific location in the file.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "The code to be inserted or replaced.",
        },
        insertRange: {
          type: "object",
          description: "The range where the code will be inserted.",
          properties: {
            startLine: {
              type: "number",
              description: "The starting line number for the insertion.",
            },
            endLine: {
              type: "number",
              description: "The ending line number for the insertion.",
            },
          },
          required: ["startLine", "endLine"],
        },
        replaceRange: {
          type: "object",
          description: "The range of code to be replaced.",
          properties: {
            startLine: {
              type: "number",
              description: "The starting line number of the code to replace.",
            },
            endLine: {
              type: "number",
              description: "The ending line number of the code to replace.",
            },
          },
          required: ["startLine", "endLine"],
        },
      },
      required: ["code", "insertRange"],
    },
  },
];

/**
 * Handler for listing available tools
 * Returns the list of registered tools and their configurations
 * 
 * @async
 * @returns {Promise<{tools: Array<Tool>}>} List of available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools,
  };
});

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
  try {
    const { name, arguments: parameters } = request.params;

    switch (name) {
      case "create_project": {
        const { projectName } = parameters as { projectName: string };

        if (!projectName || projectName.trim() === "") {
          throw new Error("Project name cannot be empty");
        }

        await createProject(projectName);
        return {
          content: [
            {
              type: "text",
              text: `Successfully created project: ${projectName}`,
            },
          ],
        };
      }

      case "navigate_page": {
        const { location } = parameters as { location: string };

        if (!location || location.trim() === "") {
          throw new Error("Location cannot be empty");
        }

        await navigatePage(location);
        return {
          content: [
            {
              type: "text",
              text: `Successfully navigated to: ${location}`,
            },
          ],
        };
      }

      case "add_sprite": {
        const { libraryName, spriteName } = parameters as {
          libraryName: string;
          spriteName: string;
        };

        if (!libraryName || libraryName.trim() === "") {
          throw new Error("Library name cannot be empty");
        }

        if (!spriteName || spriteName.trim() === "") {
          throw new Error("Sprite name cannot be empty");
        }

        await addSprite(libraryName, spriteName);
        return {
          content: [
            {
              type: "text",
              text: `Successfully added sprite '${spriteName}' from library '${libraryName}'`,
            },
          ],
        };
      }

      case "insert_code": {
        const { code, insertRange, replaceRange } = parameters as {
          code: string;
          insertRange: { startLine: number; endLine: number };
          replaceRange?: { startLine: number; endLine: number };
        };

        if (!code) {
          throw new Error("Code cannot be empty");
        }

        if (
          !insertRange ||
          typeof insertRange.startLine !== "number" ||
          typeof insertRange.endLine !== "number"
        ) {
          throw new Error("Invalid insertion range");
        }

        if (
          insertRange.startLine < 1 ||
          insertRange.endLine < insertRange.startLine
        ) {
          throw new Error("Invalid insertion line numbers");
        }

        if (
          replaceRange &&
          (typeof replaceRange.startLine !== "number" ||
            typeof replaceRange.endLine !== "number")
        ) {
          throw new Error("Invalid replace range");
        }

        if (
          replaceRange &&
          (replaceRange.startLine < 1 ||
            replaceRange.endLine < replaceRange.startLine)
        ) {
          throw new Error("Invalid replace line numbers");
        }

        await insertCode(code, insertRange, replaceRange);

        const action = replaceRange ? "replaced" : "inserted";
        const location = replaceRange
          ? `from line ${replaceRange.startLine} to ${replaceRange.endLine}`
          : `at line ${insertRange.startLine}`;

        return {
          content: [
            {
              type: "text",
              text: `Successfully ${action} code ${location}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

/**
 * Initialize the MCP server connection
 * Updates the connection status and logs the result
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When connection fails
 */
server.connect(serverTransport)
  .then(() => {
    console.log("MCP Server connected successfully");
    setServerConnected(true);
})
  .catch(error => {
    console.error("MCP Server connection failed:", error);
    setServerConnected(false);
});
