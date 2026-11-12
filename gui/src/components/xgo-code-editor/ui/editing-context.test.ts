import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { File, fromConfig, fromText, sameFileContent, type Files } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import type { ITextDocument } from '../common'
import { sameFilesOutsideDocument } from './editing-context'

function setupProject() {
  const project = new SpxProject()
  const active = new Sprite('Lita', 'onStart {\n\tstep 10\n}\n')
  const helper = new Sprite('Helper', 'var distance = 10\n')
  project.addSprite(active)
  project.addSprite(helper)
  onTestFinished(() => project.dispose())
  const document = { id: { uri: `file:///${active.codeFilePath}` } } as unknown as ITextDocument
  return { project, active, helper, document }
}

describe('Editing context with real SPX exports', () => {
  it('preserves context when editing only the current sprite recreates unrelated exported files', () => {
    const { project, active, helper, document } = setupProject()
    const before = project.exportFiles()
    active.setCode('onStart {\n\tstep \n}\n')
    const after = project.exportFiles()
    expect(after).not.toBe(before)
    expect(after['assets/index.json']).not.toBe(before['assets/index.json'])
    expect(after[helper.codeFilePath]).not.toBe(before[helper.codeFilePath])
    expect(sameFilesOutsideDocument(before, after, document)).toBe(true)
  })

  it.each(['code', 'sprite configuration', 'project configuration'])(
    'rejects a change to external %s even when the active code is also edited',
    (kind) => {
      const { project, active, helper, document } = setupProject()
      const before = project.exportFiles()
      active.setCode('onStart {\n\tstep \n}\n')
      if (kind === 'code') helper.setCode('var distance = "changed"\n')
      else if (kind === 'sprite configuration') helper.setHeading(90)
      else project.fontPreferences = ['custom', 'default']
      expect(sameFilesOutsideDocument(before, project.exportFiles(), document)).toBe(false)
    }
  )

  it('rejects newly added and removed external files', () => {
    const { project, document } = setupProject()
    const before = project.exportFiles()
    const added = { ...before, 'helpers.xgo': fromText('helpers.xgo', 'var n = 1') }
    expect(sameFilesOutsideDocument(before, added, document)).toBe(false)
    expect(sameFilesOutsideDocument(added, before, document)).toBe(false)
  })

  it('does not load or equate unknown lazy resources with different references', () => {
    const { project, document } = setupProject()
    const load = vi.fn(async () => new ArrayBuffer(0))
    const resource = new File('asset.bin', load)
    const files: Files = { ...project.exportFiles(), 'asset.bin': resource }
    expect(sameFilesOutsideDocument(files, { ...files }, document)).toBe(true)
    expect(sameFilesOutsideDocument(files, { ...files, 'asset.bin': new File('asset.bin', load) }, document)).toBe(
      false
    )
    expect(load).not.toHaveBeenCalled()
  })
})

describe('Known generated file content', () => {
  it('compares exact text and MIME type, including empty text and generated configuration', () => {
    expect(sameFileContent(fromText('first.xgo', ''), fromText('second.xgo', ''))).toBe(true)
    expect(sameFileContent(fromText('code.xgo', 'step 10'), fromText('code.xgo', 'step 20'))).toBe(false)
    expect(sameFileContent(fromConfig('a.json', { value: 1 }), fromConfig('b.json', { value: 1 }))).toBe(true)
    expect(sameFileContent(fromText('file.txt', 'same'), fromText('file.json', 'same'))).toBe(false)
    expect(sameFileContent(null, fromText('file.txt', ''))).toBe(false)
    expect(sameFileContent(null, null)).toBe(true)
  })
})
