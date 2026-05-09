import { describe, expect, it } from 'vitest'
import { getProjectEditorRouteParams } from './project-route'

describe('getProjectEditorRouteParams', () => {
  it('should preserve the current editor sub-route while updating project route params', () => {
    expect(
      getProjectEditorRouteParams(
        {
          ownerNameInput: 'aofei',
          projectNameInput: 'Gomoku1',
          inEditorPath: ['sprites', 'CurrentChess', 'code']
        },
        { owner: 'aofei', name: 'Gomoku' }
      )
    ).toEqual({
      ownerNameInput: 'aofei',
      projectNameInput: 'Gomoku',
      inEditorPath: ['sprites', 'CurrentChess', 'code']
    })
  })
})
