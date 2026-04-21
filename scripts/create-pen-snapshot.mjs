import {
  createSnapshot,
  getDefaultSnapshotDir,
  getDefaultSourcePath,
  getRepoRoot
} from './pen-protection.mjs'

const repoRoot = getRepoRoot()
const sourcePath = process.env.PEN_SNAPSHOT_SOURCE ?? getDefaultSourcePath(repoRoot)
const snapshotDir = process.env.PEN_SNAPSHOT_DIR ?? getDefaultSnapshotDir(repoRoot)
const timestamp = process.env.PEN_SNAPSHOT_TIMESTAMP == null ? new Date() : new Date(process.env.PEN_SNAPSHOT_TIMESTAMP)

const snapshotPath = await createSnapshot({
  sourcePath,
  snapshotDir,
  timestamp
})

console.log(`Created snapshot: ${snapshotPath}`)
