export const defaultTargetPath: string
export const defaultValidateCommand: string[]

export function getRepoRoot(): string
export function getDefaultSnapshotDir(repoRoot?: string): string
export function getDefaultSourcePath(repoRoot?: string): string
export function formatSnapshotTimestamp(timestamp?: Date): string

export interface CreateSnapshotOptions {
  sourcePath?: string
  snapshotDir?: string
  timestamp?: Date
}

export function createSnapshot(options?: CreateSnapshotOptions): Promise<string>

export function normalizeRepoPath(path: string): string
export function isLibraryPenPath(path: string): boolean
export function isUiPenPath(path: string): boolean

export interface ListStagedFilesOptions {
  repoRoot?: string
}

export function listStagedFiles(options?: ListStagedFilesOptions): Promise<string[]>

export interface RunCommandOptions {
  command: string
  args?: string[]
  cwd?: string
}

export function runCommand(options: RunCommandOptions): Promise<void>

export interface ValidateStagedPenOptions {
  repoRoot?: string
  targetPath?: string
  validationCwd?: string
  validateCommand?: string[]
  listStagedFiles?: (options: { repoRoot: string }) => Promise<string[]>
  runCommand?: (options: RunCommandOptions) => Promise<void>
  shouldTrigger?: (file: string) => boolean
  onTriggered?: (payload: {
    repoRoot: string
    targetPath: string
    stagedFiles: string[]
    matchedFiles: string[]
  }) => void | Promise<void>
}

export function validateStagedPen(options?: ValidateStagedPenOptions): Promise<boolean>

export interface WatchPenSnapshotsOptions {
  sourcePath?: string
  snapshotDir?: string
  onSnapshot?: (options: { sourcePath: string; snapshotDir: string }) => void | Promise<void>
}

export function watchPenSnapshots(options?: WatchPenSnapshotsOptions): Promise<() => void>
