import { shallowReactive } from 'vue'
import { capture } from '@/utils/exception'
import type { ToolDefinition } from './copilot'

export type ToolExecution =
  | {
      state: 'executing'
    }
  | {
      state: 'completed'
      result: unknown
    }
  | {
      state: 'failed'
      error: unknown
    }

export type ToolExecutionInput = {
  id: string
  tool?: unknown
  parameters?: unknown
}

export class ToolExecutor {
  /** Map of executions by call ID. */
  executions = shallowReactive(new Map<string, ToolExecution>())

  constructor(private getTools: () => ToolDefinition[]) {}

  async execute(
    { id, tool: toolName, parameters: parametersStr }: ToolExecutionInput,
    signal?: AbortSignal
  ): Promise<unknown> {
    this.executions.set(id, { state: 'executing' })
    if (this.executions.has(id)) console.warn(`Execution with ID ${id} already exists`)
    try {
      if (typeof toolName !== 'string') throw new Error('Tool name must be a string')
      if (typeof parametersStr !== 'string') throw new Error('Parameters must be JSON string')
      let parameters: unknown = null
      try {
        parameters = JSON.parse(parametersStr)
      } catch {
        throw new Error(`Failed to parse parameters. Parameters expected to be valid JSON string`)
      }
      const tools = this.getTools()
      const tool = tools.find((t) => t.name === toolName)
      if (tool == null) throw new Error(`Tool ${toolName} not found`)
      const parsedParameters = tool.parameters.parse(parameters)
      const result = await tool.implementation(parsedParameters, signal)
      this.executions.set(id, { state: 'completed', result })
      return result
    } catch (err) {
      capture(err, `Failed to execute tool ${toolName}`)
      this.executions.set(id, { state: 'failed', error: err })
    }
  }

  getExecution(id: string): ToolExecution | null {
    return this.executions.get(id) ?? null
  }
}
