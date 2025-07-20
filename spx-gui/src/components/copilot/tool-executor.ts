import { shallowReactive } from 'vue'
import { capture } from '@/utils/exception'
import type { ToolDefinitionWithImplementation } from './copilot'

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
  tool: string
  parameters: unknown
}

export class ToolExecutor {
  /** Map of executions by call ID. */
  executions = shallowReactive(new Map<string, ToolExecution>())

  constructor(private getTools: () => ToolDefinitionWithImplementation[]) {}

  async execute({ id, tool: toolName, parameters }: ToolExecutionInput, signal?: AbortSignal): Promise<unknown> {
    if (this.executions.has(id)) console.warn(`Execution with ID ${id} already exists`)
    this.executions.set(id, { state: 'executing' })
    try {
      const tools = this.getTools()
      const tool = tools.find((t) => t.name === toolName)
      if (tool == null) throw new Error(`Tool ${toolName} not found`)
      // TODO: validate parameters against tool.parameters
      const result = await tool.implementation(parameters, signal)
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
