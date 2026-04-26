import {
  createSnapshot,
  defaultValidateCommand,
  getDefaultSnapshotDir,
  getDefaultSourcePath,
  getRepoRoot,
  isLibraryPenPath,
  isUiPenPath,
  validateStagedPen
} from './pen-protection.mjs'

const repoRoot = getRepoRoot()
const sourcePath = process.env.PEN_SNAPSHOT_SOURCE ?? getDefaultSourcePath(repoRoot)
const snapshotDir = process.env.PEN_SNAPSHOT_DIR ?? getDefaultSnapshotDir(repoRoot)
const targetPath = process.env.PEN_TARGET_PATH ?? 'ui/components/spx/builder-component.lib.pen'
const validateCommand =
  process.env.PEN_VALIDATE_COMMAND == null
    ? defaultValidateCommand
    : [process.env.PEN_VALIDATE_COMMAND, ...JSON.parse(process.env.PEN_VALIDATE_ARGS ?? '[]')]

const triggered = await validateStagedPen({
  repoRoot,
  targetPath,
  shouldTrigger: isUiPenPath,
  validateCommand,
  onTriggered: async ({ matchedFiles }) => {
    if (matchedFiles.some(isLibraryPenPath)) {
      const snapshotPath = await createSnapshot({ sourcePath, snapshotDir })
      console.log(`Created snapshot before validation: ${snapshotPath}`)
    }

    console.log(`Running pen validation for staged files: ${matchedFiles.join(', ')}`)
  }
})

if (!triggered) console.log('Skipped pen validation; no staged ui .pen files detected')
