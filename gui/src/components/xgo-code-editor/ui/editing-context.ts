import { sameFileContent, type Files } from '@/models/common/file'
import { getCodeFilePath, type ITextDocument } from '../common'

/** An edit in another file can change the meaning of the current statement. */
export function sameFilesOutsideDocument(before: Files, after: Files, document: ITextDocument) {
  const path = getCodeFilePath(document.id.uri)
  const paths = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const filePath of paths) {
    if (filePath !== path && !sameFileContent(before[filePath], after[filePath])) return false
  }
  return true
}
