import { z } from 'zod'

import { UniversalUrlScheme } from '@/utils/universal-url'
import type { FileCollection, UniversalUrl } from '@/apis/common'
import { createFileWithUniversalUrl, getFiles, saveFile, saveFiles } from '@/models/common/cloud'
import { fromConfig, toText, type Files } from '@/models/common/file'

/**
 * Schema of the universal URL of a Project Snapshot.
 * Only Kodo URLs are accepted, so Feedback always refers to a Project Snapshot saved in Builder's storage.
 */
export const projectSnapshotUrlSchema = z.string().startsWith(`${UniversalUrlScheme.Kodo}://`)

type ProjectSnapshot = {
  /** Project files, in the same form as the files of a cloud project. */
  files: FileCollection
}

const projectSnapshotFileName = 'project-snapshot.json'

/** Saves project files as a Project Snapshot in Kodo. */
export async function saveProjectSnapshot(files: Files, signal?: AbortSignal): Promise<UniversalUrl> {
  const { fileCollection } = await saveFiles(files, signal)
  const snapshot: ProjectSnapshot = { files: fileCollection }
  return saveFile(fromConfig(projectSnapshotFileName, snapshot), { signal, inlineable: false })
}

/** Loads the project files saved in a Project Snapshot. */
export async function loadProjectSnapshot(url: UniversalUrl, signal?: AbortSignal): Promise<Files> {
  const text = await toText(createFileWithUniversalUrl(url, projectSnapshotFileName), signal)
  const snapshot: ProjectSnapshot = JSON.parse(text)
  return getFiles(snapshot.files)
}
