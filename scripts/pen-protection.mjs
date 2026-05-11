import { execFile, spawn } from 'node:child_process'
import { watchFile, unwatchFile } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const defaultTargetPath = 'ui/components/spx/builder-component.lib.pen'
export const defaultValidateCommand = [
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

export function getRepoRoot() {
  return resolve(fileURLToPath(new URL('..', import.meta.url)))
}

export function getDefaultSnapshotDir(repoRoot = getRepoRoot()) {
  return resolve(repoRoot, 'ui/components/spx/.snapshots')
}

export function getDefaultSourcePath(repoRoot = getRepoRoot()) {
  return resolve(repoRoot, defaultTargetPath)
}

export function formatSnapshotTimestamp(timestamp = new Date()) {
  const isoString = timestamp.toISOString()
  return isoString.replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')
}

export async function createSnapshot({
  sourcePath = getDefaultSourcePath(),
  snapshotDir = getDefaultSnapshotDir(),
  timestamp = new Date()
} = {}) {
  const extension = extname(sourcePath)
  const fileName = `${basename(sourcePath, extension)}-${formatSnapshotTimestamp(timestamp)}${extension}`
  const snapshotPath = join(snapshotDir, fileName)

  await mkdir(snapshotDir, { recursive: true })
  await copyFile(sourcePath, snapshotPath)

  return snapshotPath
}

export function normalizeRepoPath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '')
}

export function isLibraryPenPath(path) {
  return normalizeRepoPath(path) === defaultTargetPath
}

export function isUiPenPath(path) {
  const normalizedPath = normalizeRepoPath(path)
  return normalizedPath.startsWith('ui/') && normalizedPath.endsWith('.pen')
}

export async function listStagedFiles({ repoRoot = getRepoRoot() } = {}) {
  const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: repoRoot
  })
  return stdout
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
}

export async function runCommand({ command, args = [], cwd = getRepoRoot() }) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit'
    })

    child.once('error', rejectPromise)
    child.once('exit', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      rejectPromise(new Error(`${command} exited with code ${String(code)}`))
    })
  })
}

export async function validateStagedPen({
  repoRoot = getRepoRoot(),
  targetPath = defaultTargetPath,
  validationCwd = resolve(repoRoot, 'spx-gui'),
  validateCommand = defaultValidateCommand,
  listStagedFiles: getStagedFiles = listStagedFiles,
  runCommand: executeCommand = runCommand,
  shouldTrigger,
  onTriggered
} = {}) {
  const stagedFiles = await getStagedFiles({ repoRoot })
  const normalizedStagedFiles = stagedFiles.map((file) => normalizeRepoPath(file))
  const normalizedTargetPath = normalizeRepoPath(targetPath)
  const matchedFiles = normalizedStagedFiles.filter((file) =>
    shouldTrigger == null ? file === normalizedTargetPath : shouldTrigger(file)
  )

  if (matchedFiles.length === 0) return false

  if (onTriggered != null) {
    await onTriggered({
      repoRoot,
      targetPath: normalizedTargetPath,
      stagedFiles: normalizedStagedFiles,
      matchedFiles
    })
  }

  const [command, ...args] = validateCommand
  await executeCommand({
    command,
    args,
    cwd: validationCwd
  })

  return true
}

export async function watchPenSnapshots({
  sourcePath = getDefaultSourcePath(),
  snapshotDir = getDefaultSnapshotDir(),
  onSnapshot = createSnapshot
} = {}) {
  await stat(sourcePath)

  let isSnapshotPending = false

  const handleChange = async () => {
    if (isSnapshotPending) return
    isSnapshotPending = true
    try {
      await onSnapshot({ sourcePath, snapshotDir })
    } finally {
      isSnapshotPending = false
    }
  }

  watchFile(sourcePath, { interval: 500 }, async (current, previous) => {
    if (current.mtimeMs === 0 || current.mtimeMs === previous.mtimeMs) return
    await handleChange()
  })

  return () => unwatchFile(sourcePath)
}
