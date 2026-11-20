import { describe, expect, it } from 'vitest'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { getCodeContext, getProjectContext } from '.'

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
      otherFilesHidden: false
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
      otherFilesHidden: false
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
      otherFilesHidden: false
    })

    expect(context).toContain('(lines 28-40; `lineCount`')
  })

  it('says when the editor keeps the user on the current file', () => {
    const params = { codeFilePath: 'Bird.spx', code, cursorPosition: null, selection: null }
    const hidden = 'The editor keeps the user on this file: they cannot open the code of other sprites or the stage'

    expect(getCodeContext({ ...params, otherFilesHidden: true })).toContain(hidden)
    expect(getCodeContext({ ...params, otherFilesHidden: false })).not.toContain(hidden)
  })
})
