import { describe, expect, it } from 'vitest'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { getProjectContext } from '.'

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
