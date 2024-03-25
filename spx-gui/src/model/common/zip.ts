/**
 * @file Zip file related helper
 * @desc load-from & export-to zip file
 */

import JSZip from 'jszip'
import { filename, stripExt } from '@/util/path'
import { File as LazyFile, type Files as LazyFiles } from './file'
import type { Metadata } from '../project'

export async function load(zipFile: File) {
  const metadata: Metadata = {
    name: stripExt(zipFile.name)
  }
  const jszip = await JSZip.loadAsync(zipFile)
  const files: LazyFiles = {}
  await Promise.all(Object.keys(jszip.files).map(async path => {
    const zipEntry = jszip.files[path]
    const content = await zipEntry.async('arraybuffer')
    files[path] = new LazyFile(filename(path), null, content)
  }))
  return { metadata, files }
}

export async function save({ name }: Metadata, files: LazyFiles) {
  const zip = new JSZip()
  await Promise.all(Object.keys(files).map(async path => {
    const content = await files[path]!.arrayBuffer()
    zip.file(path, content)
  }))
  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], (name || 'Untitled') + '.zip')
}
