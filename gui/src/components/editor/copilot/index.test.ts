import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import * as apis from '@/apis/copilot'
import { Copilot, type IMessageEventGenerator } from '@/components/copilot/copilot'
import { InMemorySkillRegistry } from '@/components/copilot/skills/registry'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import type { EditorCtx } from '../EditorContextProvider.vue'
import { EditMode } from '../editor-state'
import type { CodeEditor } from '../spx-code-editor'
import { CodeContextProvider, getCodeContext, getProjectContext } from '.'

function makeProject(owner?: string, name?: string) {
  const project = new SpxProject(owner, name)
  const sprite = new Sprite('Bird')
  sprite.setCode('onStart => {\n\tstep 10\n}')
  project.addSprite(sprite)
  project.stage.setCode('var score int')
  return project
}

describe('getProjectContext', () => {
  it('lists code files with their line counts', () => {
    const context = getProjectContext(makeProject('alice', 'flappy'))

    expect(context).toContain('The user is now working on project: flappy (alice/flappy)')
    expect(context).toContain('### Code files\n- `main.spx` (stage, 1 lines)\n- `Bird.spx` (3 lines)')
  })

  it('tells Copilot to omit the project parameter for a project without owner and name', () => {
    const context = getProjectContext(makeProject())

    expect(context).toContain('an unsaved project that has no owner or name')
    expect(context).toContain('omit the `project` parameter')
    expect(context).not.toContain('undefined')
  })
})

describe('getCodeContext', () => {
  const code = Array.from({ length: 40 }, (_, i) => `line${i + 1}`).join('\n')

  it('shows a whole short file and tells Copilot to read other code itself', () => {
    const context = getCodeContext({
      codeFilePath: 'Bird.spx',
      code: 'onStart => {\n\tstep 10\n}',
      cursorPosition: { line: 2, column: 3 },
      selection: null,
      otherFilesHidden: false,
      canReadProjectCode: true
    })

    expect(context).toBe(`# Current code
The user is now viewing / editing code of file \`Bird.spx\`. Cursor position: Line 2, Column 3. Selection: None.
Code content of \`Bird.spx\` (the whole file; \`lineCount\` is the number of lines in the file):
{"lineCount":3,"sampledLines":{"1":"onStart => {","2":"\\tstep 10","3":"}"}}
Other code of the project is not in this context. If and only if a question depends on code you have not seen, read that code with \`get_project_code\` before replying. Read it yourself instead of asking the user to look it up.`)
  })

  it('states which lines of a long file are shown', () => {
    const context = getCodeContext({
      codeFilePath: 'Bird.spx',
      code,
      cursorPosition: { line: 25, column: 1 },
      selection: null,
      otherFilesHidden: false,
      canReadProjectCode: true
    })

    expect(context).toContain(
      'Code content of `Bird.spx` (lines 15-35; `lineCount` is the number of lines in the file):'
    )
    expect(context).toContain('{"lineCount":40,"sampledLines":{"15":"line15",')
    expect(context).toContain('"35":"line35"}}')
  })

  it('clips the shown range at the end of the file', () => {
    const context = getCodeContext({
      codeFilePath: 'Bird.spx',
      code,
      cursorPosition: { line: 38, column: 1 },
      selection: null,
      otherFilesHidden: false,
      canReadProjectCode: true
    })

    expect(context).toContain('(lines 28-40; `lineCount`')
  })

  it('says when the editor keeps the user on the current file', () => {
    const params = { canReadProjectCode: true, codeFilePath: 'Bird.spx', code, cursorPosition: null, selection: null }
    const hidden = 'The editor keeps the user on this file: they cannot open the code of other sprites or the stage'

    expect(getCodeContext({ ...params, otherFilesHidden: true })).toContain(hidden)
    expect(getCodeContext({ ...params, otherFilesHidden: false })).not.toContain(hidden)
  })
})

describe('editor code context in Copilot requests', () => {
  it.each(['conversation', 'JSON', 'text', 'conversation without code tool'] as const)(
    'matches the tools available to a %s request and keeps fresh code context',
    async (kind) => {
      const calls: Array<{ messages: apis.Message[]; tools: apis.Tool[] }> = []
      const generator: IMessageEventGenerator = {
        async *generateCopilotMessage(messages, options) {
          const tools = options?.tools ?? []
          calls.push({ messages, tools })
          if (kind === 'JSON') {
            yield {
              type: 'tool_call_delta',
              data: {
                index: 0,
                id: 'return_json_1',
                function: { name: 'return_json', arguments: '{"complete":true}' }
              }
            }
          } else {
            yield { type: 'text_delta', data: { text: 'Done' } }
          }
          yield { type: 'done', data: { finishReason: 'stop' } }
        }
      }
      const copilot = new Copilot(new InMemorySkillRegistry(), generator)
      const editorCtx = { state: { selectedEditMode: EditMode.Default } }
      let code = 'old code'
      const ui = {
        activeTextDocument: { id: { uri: 'file:///Bird.spx' }, getValue: () => code },
        cursorPosition: { line: 1, column: 1 },
        selection: null
      }
      const codeEditor = { getAttachedUI: () => ui }
      copilot.registerContextProvider(
        new CodeContextProvider(editorCtx as unknown as EditorCtx, codeEditor as unknown as CodeEditor)
      )
      if (kind !== 'conversation without code tool') {
        copilot.registerTool({
          name: 'get_project_code',
          description: 'Read project code',
          parameters: z.object({}),
          implementation: async () => 'Other code'
        })
      }
      await copilot.startSession({ title: { en: 'Course', zh: '课程' }, description: '', reactToEvents: false })
      code = 'onStart => {\n\tstep 20\n}'
      ui.cursorPosition = { line: 2, column: 3 }
      editorCtx.state.selectedEditMode = EditMode.Simple

      if (kind === 'JSON') {
        await expect(copilot.generateJSONResponse('Assess the code', { type: 'object' })).resolves.toEqual({
          complete: true
        })
      } else if (kind === 'text') {
        await expect(copilot.generateTextResponse('Give feedback')).resolves.toBe('Done')
      } else {
        const completed = new Promise<void>((resolve) => copilot.on('roundComplete', () => resolve()))
        copilot.addUserTextMessage('Help with this code')
        await completed
      }

      expect(calls).toHaveLength(1)
      const { messages, tools } = calls[0]
      const context = messages.map((message) => message.content?.text ?? '').join('\n')
      expect(context).toContain('Cursor position: Line 2, Column 3')
      expect(context).toContain('The editor keeps the user on this file')
      expect(context).toContain(
        JSON.stringify({ lineCount: 3, sampledLines: { 1: 'onStart => {', 2: '\tstep 20', 3: '}' } })
      )
      expect(context).not.toContain('old code')
      if (kind === 'conversation') {
        expect(tools.map((tool) => tool.function.name)).toContain('get_project_code')
        expect(context).toContain('read that code with `get_project_code` before replying')
      } else {
        expect(context).not.toContain('get_project_code')
        expect(context).not.toContain('Read it yourself instead of asking the user to look it up')
        if (kind === 'JSON') expect(tools.map((tool) => tool.function.name)).toEqual(['return_json'])
        else if (kind === 'text') expect(tools).toEqual([])
        else expect(tools.map((tool) => tool.function.name)).not.toContain('get_project_code')
      }
      copilot.dispose()
    }
  )
})
