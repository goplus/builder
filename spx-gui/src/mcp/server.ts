/**
 * MCP Server implementation for SPX Builder
 * Handles tool registration, request processing, and server-side operations
 * @module server
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { serverTransport, setServerConnected } from './transport'
import { createProject, navigatePage, addSprite, insertCode } from './tools'
import { ref } from 'vue'

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
 * Available tools configuration
 * Defines the tools that can be called through the MCP server
 *
 * @constant
 * @type {Array<Tool>}
 */
export const tools = [
  {
    name: 'create_project',
    description: 'Create a new project with the specified name.',
    parameters: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'The name of the project to be created.'
        }
      },
      required: ['projectName']
    }
  },
  {
    name: 'navigate_page',
    description: 'Navigate to a specific page using the provided location URL.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The URL or path of the page to navigate to.'
        }
      },
      required: ['location']
    }
  },
  {
    name: 'add_sprite',
    description: 'Add a new sprite to the project from the specified library.',
    parameters: {
      type: 'object',
      properties: {
        libraryName: {
          type: 'string',
          description: 'The name of the library containing the sprite.'
        },
        spriteName: {
          type: 'string',
          description: 'The name of the sprite to be added after selection.'
        }
      },
      required: ['libraryName', 'spriteName']
    }
  },
  {
    name: 'insert_code',
    description: 'Insert or replace code at a specific location in the file.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to be inserted or replaced.'
        },
        insertRange: {
          type: 'object',
          description: 'The range where the code will be inserted.',
          properties: {
            startLine: {
              type: 'number',
              description: 'The starting line number for the insertion.'
            },
            endLine: {
              type: 'number',
              description: 'The ending line number for the insertion.'
            }
          },
          required: ['startLine', 'endLine']
        },
        replaceRange: {
          type: 'object',
          description: 'The range of code to be replaced.',
          properties: {
            startLine: {
              type: 'number',
              description: 'The starting line number of the code to replace.'
            },
            endLine: {
              type: 'number',
              description: 'The ending line number of the code to replace.'
            }
          },
          required: ['startLine', 'endLine']
        }
      },
      required: ['code', 'insertRange']
    }
  }
]

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
    let result

    switch (name) {
      case 'create_project': {
        const { projectName } = parameters as { projectName: string }
        if (!projectName || projectName.trim() === '') {
          const errorMsg = 'Project name cannot be empty';
          
          // 更新请求历史，记录错误
          mcpRequestHistory.value[0].response = errorMsg;
          mcpRequestHistory.value[0].error = true;
          
          // 返回错误结果而不是抛出异常
          return {
            content: [
              {
                type: 'text',
                text: errorMsg
              }
            ],
            error: true // 可选，标记此结果为错误
          };
        }

        const createResult = await createProject(projectName)
        // 根据执行结果构建响应
        if (createResult.success) {
          result = {
            content: [
              {
                type: 'text',
                text: createResult.message || `Successfully created project: ${projectName}`
              }
            ]
          }
        } else {
          // 项目创建失败 - 不抛出错误，而是返回错误信息
          result = {
            content: [
              {
                type: 'text',
                text: `Failed to create project: ${createResult.message || 'Unknown error'}`
              }
            ],
            error: true // 可选，标记此结果为错误
          };
          
          // 更新请求历史，标记为错误
          mcpRequestHistory.value[0].error = true;
        }
        // Update request history with success response
        mcpRequestHistory.value[0].response = JSON.stringify(result, null, 2)
        return result
      }

      case 'navigate_page': {
        const { location } = parameters as { location: string }

        if (!location || location.trim() === '') {
          throw new Error('Location cannot be empty')
        }

        await navigatePage(location)
        result = {
          content: [
            {
              type: 'text',
              text: `Successfully navigated to: ${location}`
            }
          ]
        }
        // Update request history with success response
        mcpRequestHistory.value[0].response = JSON.stringify(result, null, 2)
        return result
      }

      case 'add_sprite': {
        const { spriteHubName, spriteName } = parameters as { 
          spriteHubName: string, 
          spriteName: string 
        };
        
        // 验证必需参数
        if (!spriteHubName || typeof spriteHubName !== 'string') {
          const errorMsg = 'Sprite hub name is required and must be a string';
          mcpRequestHistory.value[0].response = errorMsg;
          mcpRequestHistory.value[0].error = true;
          return {
            content: [{ type: 'text', text: errorMsg }],
            error: true
          };
        }
        
        if (!spriteName || typeof spriteName !== 'string') {
          const errorMsg = 'Sprite name is required and must be a string';
          mcpRequestHistory.value[0].response = errorMsg;
          mcpRequestHistory.value[0].error = true;
          return {
            content: [{ type: 'text', text: errorMsg }],
            error: true
          };
        }
        
        const addResult = await addSprite(spriteHubName, spriteName);
        
        if (addResult.success) {
          result = {
            content: [
              {
                type: 'text',
                text: addResult.message || `Successfully added sprite "${spriteName}"`
              }
            ]
          };
        } else {
          result = {
            content: [
              {
                type: 'text',
                text: `Failed to add sprite: ${addResult.message || 'Unknown error'}`
              }
            ],
            error: true
          };
        }
        
        mcpRequestHistory.value[0].response = JSON.stringify(result, null, 2);
        return result;
      }

      case 'insert_code': {
        const { code, insertRange, replaceRange } = parameters as {
          code: string
          insertRange: { startLine: number; endLine: number }
          replaceRange?: { startLine: number; endLine: number }
        }

        if (!code) {
          throw new Error('Code cannot be empty')
        }

        if (!insertRange || typeof insertRange.startLine !== 'number' || typeof insertRange.endLine !== 'number') {
          throw new Error('Invalid insertion range')
        }

        if (insertRange.startLine < 1 || insertRange.endLine < insertRange.startLine) {
          throw new Error('Invalid insertion line numbers')
        }

        if (replaceRange && (typeof replaceRange.startLine !== 'number' || typeof replaceRange.endLine !== 'number')) {
          throw new Error('Invalid replace range')
        }

        if (replaceRange && (replaceRange.startLine < 1 || replaceRange.endLine < replaceRange.startLine)) {
          throw new Error('Invalid replace line numbers')
        }

        await insertCode(code, insertRange, replaceRange)

        const action = replaceRange ? 'replaced' : 'inserted'
        const location = replaceRange
          ? `from line ${replaceRange.startLine} to ${replaceRange.endLine}`
          : `at line ${insertRange.startLine}`

        result = {
          content: [
            {
              type: 'text',
              text: `Successfully ${action} code ${location}`
            }
          ]
        }
        // Update request history with success response
        mcpRequestHistory.value[0].response = JSON.stringify(result, null, 2)
        return result
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
