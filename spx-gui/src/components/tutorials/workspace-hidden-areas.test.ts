import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { editorWorkspaceLayout } from '@/components/editor/workspace-layout'
import WorkspaceHiddenAreas from './workspace-hidden-areas'

describe('WorkspaceHiddenAreas', () => {
  afterEach(() => {
    editorWorkspaceLayout.reset()
  })

  it('should hide the listed areas', () => {
    mount(WorkspaceHiddenAreas, { props: { areas: 'editor-panels, edit-mode-switch' } })
    expect(editorWorkspaceLayout.isHidden('editor-panels')).toBe(true)
    expect(editorWorkspaceLayout.isHidden('edit-mode-switch')).toBe(true)
    expect(editorWorkspaceLayout.isHidden('preview-header')).toBe(false)
    expect(editorWorkspaceLayout.isHidden('code-editor-tools')).toBe(false)
  })

  it('should ignore unknown area names', () => {
    mount(WorkspaceHiddenAreas, { props: { areas: 'no-such-area,preview-header' } })
    expect(editorWorkspaceLayout.hiddenAreas).toEqual(new Set(['preview-header']))
  })

  it('should re-apply when areas change, with the latest one winning', async () => {
    const wrapper = mount(WorkspaceHiddenAreas, { props: { areas: 'editor-panels' } })
    expect(editorWorkspaceLayout.isHidden('editor-panels')).toBe(true)

    await wrapper.setProps({ areas: 'code-editor-tools' })
    expect(editorWorkspaceLayout.isHidden('editor-panels')).toBe(false)
    expect(editorWorkspaceLayout.isHidden('code-editor-tools')).toBe(true)

    await wrapper.setProps({ areas: '' })
    expect(editorWorkspaceLayout.hiddenAreas.size).toBe(0)
  })
})
