import { describe, expect, it } from 'vitest'
import { accumulateToolCallDelta, finalizeToolCalls, type ToolCallDraft } from './tool-call'

describe('accumulateToolCallDelta', () => {
  it('should accumulate tool call fragments by index', () => {
    const toolCalls: Array<ToolCallDraft | null> = []

    accumulateToolCallDelta(toolCalls, {
      type: 'tool_call_delta',
      data: {
        index: 1,
        function: {
          arguments: '{"file":"'
        }
      }
    })
    accumulateToolCallDelta(toolCalls, {
      type: 'tool_call_delta',
      data: {
        index: 0,
        id: 'call_0',
        function: {
          name: 'list_projects',
          arguments: '{"query":"demo"}'
        }
      }
    })
    accumulateToolCallDelta(toolCalls, {
      type: 'tool_call_delta',
      data: {
        index: 1,
        id: 'call_1',
        function: {
          name: 'get_project_code'
        }
      }
    })
    accumulateToolCallDelta(toolCalls, {
      type: 'tool_call_delta',
      data: {
        index: 1,
        function: {
          arguments: 'main.spx"}'
        }
      }
    })

    expect(toolCalls[0]).toEqual({
      id: 'call_0',
      type: 'function',
      function: {
        name: 'list_projects',
        arguments: '{"query":"demo"}'
      }
    })
    expect(toolCalls[1]).toEqual({
      id: 'call_1',
      type: 'function',
      function: {
        name: 'get_project_code',
        arguments: '{"file":"main.spx"}'
      }
    })
  })
})

describe('finalizeToolCalls', () => {
  it('should finalize completed tool calls', () => {
    expect(
      finalizeToolCalls([
        {
          id: 'call_0',
          type: 'function',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }
      ])
    ).toEqual([
      {
        id: 'call_0',
        type: 'function',
        function: {
          name: 'list_projects',
          arguments: '{"query":"demo"}'
        }
      }
    ])
  })

  it('should reject incomplete tool calls', () => {
    expect(() =>
      finalizeToolCalls([
        {
          id: null,
          type: 'function',
          function: {
            name: 'list_projects',
            arguments: '{"query":"demo"}'
          }
        }
      ])
    ).toThrow('Incomplete tool call at index 0: missing id')
  })
})
