import { beforeEach, describe, expect, it } from 'vitest'
import { editorWorkspaceLayout } from './workspace-layout'

describe('editorWorkspaceLayout', () => {
  beforeEach(() => {
    editorWorkspaceLayout.reset()
  })

  it('should keep optional tools disabled by default', () => {
    expect(editorWorkspaceLayout.isToolEnabled('ruler')).toBe(false)
  })

  it('should enable the tools a guided scenario asks for', () => {
    editorWorkspaceLayout.setEnabledTools(['ruler'])
    expect(editorWorkspaceLayout.isToolEnabled('ruler')).toBe(true)
  })

  it('should disable the tools on reset, so none of them outlives the scenario that enabled it', () => {
    editorWorkspaceLayout.setEnabledTools(['ruler'])
    editorWorkspaceLayout.setHiddenAreas(['editor-panels'])
    editorWorkspaceLayout.setMode('focused')

    editorWorkspaceLayout.reset()

    expect(editorWorkspaceLayout.isToolEnabled('ruler')).toBe(false)
    expect(editorWorkspaceLayout.isHidden('editor-panels')).toBe(false)
    expect(editorWorkspaceLayout.mode).toBe('default')
  })
})
