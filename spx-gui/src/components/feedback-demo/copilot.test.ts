import { describe, expect, it, vi } from 'vitest'
import { createPrepareFeedbackTool } from './copilot'

describe('feedback Copilot tool', () => {
  it('prepares a trimmed draft that still requires user confirmation', async () => {
    const onPrepare = vi.fn()
    const tool = createPrepareFeedbackTool(onPrepare)
    const parameters = tool.parameters.parse({
      title: '  Project does not start  ',
      description: '  Running the project stays on the loading screen.  '
    })

    const result = await tool.implementation(parameters)

    expect(onPrepare).toHaveBeenCalledWith({
      title: 'Project does not start',
      description: 'Running the project stays on the loading screen.'
    })
    expect(result).toMatchObject({
      status: 'prepared',
      requiresUserConfirmation: true
    })
  })

  it('rejects an empty feedback draft', () => {
    const tool = createPrepareFeedbackTool(() => {})

    expect(() => tool.parameters.parse({ title: ' ', description: 'Something happened.' })).toThrow()
  })
})
