import {
  createSnapshot,
  defaultValidateCommand,
  getDefaultSnapshotDir,
  getDefaultSourcePath,
  getRepoRoot,
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
  validateCommand,
  onTriggered: async () => {
    const snapshotPath = await createSnapshot({ sourcePath, snapshotDir })
    console.log(`Created snapshot before validation: ${snapshotPath}`)
  }
})

if (!triggered) console.log('Skipped builder-component.lib.pen validation; file is not staged')
