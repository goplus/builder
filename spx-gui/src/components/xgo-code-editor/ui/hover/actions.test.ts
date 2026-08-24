import { describe, expect, it } from 'vitest'
import type { Action } from '../../common'
import { builtInCommandGoToDefinition, builtInCommandGoToResource, builtInCommandRename } from '../code-editor-ui'
import { filterHoverActions } from './actions'

const actions = [
  { command: builtInCommandGoToDefinition, arguments: [] },
  { command: builtInCommandGoToResource, arguments: [] },
  { command: builtInCommandRename, arguments: [] }
] as unknown as Action[]

describe('filterHoverActions', () => {
  it('hides navigation actions while keeping other actions', () => {
    expect(filterHoverActions(actions, false)).toEqual([actions[2]])
  })

  it('keeps all actions when navigation is enabled', () => {
    expect(filterHoverActions(actions, true)).toBe(actions)
  })
})
