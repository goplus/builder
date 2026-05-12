import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, it, vitest } from 'vitest'

import { createSnapshot, defaultValidateCommand, validateStagedPen } from '../../../scripts/pen-protection.mjs'

const repoRoot = resolve(process.cwd(), '..')
const expectedValidateCommand = [
  'npm',
  'run',
  'test',
  '--',
  '--root',
  '..',
  '--no-cache',
  'ui/tests/pen/builder-component-lib.test.ts',
  '--run'
]

describe('createSnapshot', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) rmSync(tempDir, { recursive: true, force: true })
  })

  it('copies the pen file into a timestamped snapshot file', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'builder-pen-protection-'))
    tempDirs.push(tempDir)

    const sourcePath = join(tempDir, 'builder-component.lib.pen')
    const snapshotDir = join(tempDir, '.snapshots')
    writeFileSync(sourcePath, '{"id":"root"}\n')

    const snapshotPath = await createSnapshot({
      sourcePath,
      snapshotDir,
      timestamp: new Date('2026-04-21T10:11:12Z')
    })

    expect(snapshotPath).toBe(join(snapshotDir, 'builder-component.lib-20260421T101112Z.pen'))
    expect(readdirSync(snapshotDir)).toEqual(['builder-component.lib-20260421T101112Z.pen'])
    expect(readFileSync(snapshotPath, 'utf8')).toBe('{"id":"root"}\n')
  })
})

describe('validateStagedPen', () => {
  it('runs the validation command when builder-component.lib.pen is staged', async () => {
    const listStagedFiles = vitest.fn().mockResolvedValue(['ui/components/spx/builder-component.lib.pen'])
    const runCommand = vitest.fn().mockResolvedValue(undefined)

    const triggered = await validateStagedPen({
      repoRoot,
      listStagedFiles,
      runCommand
    })

    expect(triggered).toBe(true)
    expect(runCommand).toHaveBeenCalledWith({
      command: 'npm',
      args: expectedValidateCommand.slice(1),
      cwd: resolve(repoRoot, 'spx-gui')
    })
  })

  it('runs the validation command when a staged ui page pen matches the trigger predicate', async () => {
    const listStagedFiles = vitest.fn().mockResolvedValue(['ui/pages/spx/community-home.pen'])
    const runCommand = vitest.fn().mockResolvedValue(undefined)
    const onTriggered = vitest.fn().mockResolvedValue(undefined)

    const triggered = await validateStagedPen({
      repoRoot,
      listStagedFiles,
      runCommand,
      shouldTrigger: (file: string) => file.startsWith('ui/') && file.endsWith('.pen'),
      onTriggered
    } as never)

    expect(triggered).toBe(true)
    expect(runCommand).toHaveBeenCalledWith({
      command: 'npm',
      args: expectedValidateCommand.slice(1),
      cwd: resolve(repoRoot, 'spx-gui')
    })
    expect(onTriggered).toHaveBeenCalledWith({
      matchedFiles: ['ui/pages/spx/community-home.pen'],
      repoRoot,
      stagedFiles: ['ui/pages/spx/community-home.pen'],
      targetPath: 'ui/components/spx/builder-component.lib.pen'
    })
  })

  it('skips validation when the component library is not staged', async () => {
    const listStagedFiles = vitest.fn().mockResolvedValue(['README.md'])
    const runCommand = vitest.fn().mockResolvedValue(undefined)

    const triggered = await validateStagedPen({
      repoRoot,
      listStagedFiles,
      runCommand
    })

    expect(triggered).toBe(false)
    expect(runCommand).not.toHaveBeenCalled()
  })

  it('uses the repo-root pen validation test as the default validation command', () => {
    expect(defaultValidateCommand).toEqual(expectedValidateCommand)
  })
})
