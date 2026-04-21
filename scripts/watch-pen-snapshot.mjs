import {
  createSnapshot,
  getDefaultSnapshotDir,
  getDefaultSourcePath,
  getRepoRoot,
  watchPenSnapshots
} from './pen-protection.mjs'

const repoRoot = getRepoRoot()
const sourcePath = process.env.PEN_SNAPSHOT_SOURCE ?? getDefaultSourcePath(repoRoot)
const snapshotDir = process.env.PEN_SNAPSHOT_DIR ?? getDefaultSnapshotDir(repoRoot)

const stopWatching = await watchPenSnapshots({
  sourcePath,
  snapshotDir,
  onSnapshot: async ({ sourcePath, snapshotDir }) => {
    const snapshotPath = await createSnapshot({ sourcePath, snapshotDir })
    console.log(`Created snapshot: ${snapshotPath}`)
  }
})

const shutdown = () => {
  stopWatching()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log(`Watching ${sourcePath} for changes`)
