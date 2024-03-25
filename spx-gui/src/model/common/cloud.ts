import * as qiniu from 'qiniu-js'
import { filename } from '@/util/path'
import { File, toNativeFile, type Files } from './file'
import type { FileCollection } from '@/api/project'
import { getProject, updateProject } from '@/api/project'
import { uptoken } from '@/api/util'
import { staticBaseUrl } from '@/util/env'
import type { Metadata } from '../project'

export async function load(owner: string, name: string) {
  const { files: fileUrls, ...metadata } = await getProject(owner, name)
  const files = getFiles(fileUrls)
  return { metadata, files }
}

export async function save(metadata: Metadata, files: Files) {
  const { owner, name, isPublic } = metadata
  if (owner == null || name == null || isPublic == null) throw new Error('owner, name, isPublic expected')
  const fileUrls = await uploadFiles(files)
  await updateProject(owner, name, { isPublic, files: fileUrls })
}

export async function uploadFiles(files: Files): Promise<FileCollection> {
  const fileUrls: FileCollection = {}
  await Promise.all(Object.keys(files).map(async path => {
    fileUrls[path] = await uploadFile(files[path]!)
  }))
  return fileUrls
}

export function getFiles(fileUrls: FileCollection): Files {
  const files: Files = {}
  Object.keys(fileUrls).forEach(path => {
    const url = fileUrls[path]
    files[path] = new File(filename(path), url)
  })
  return files
}

async function uploadFile(file: File) {
  if (file.publicUrl != null) return file.publicUrl
  return file.publicUrl = await upload(file)
}

type QiniuUploadRes = {
  key: string
  hash: string
}

async function upload(file: File) {
  const nativeFile = await toNativeFile(file)
  const token = await uptoken()
  const observable = qiniu.upload(
    nativeFile,
    null,
    token,
    { fname: file.name },
    { region: 'na0' }
  )
  const { key } = await new Promise<QiniuUploadRes>((resolve, reject) => {
    observable.subscribe({
      error(e) {
        reject(e)
      },
      complete(res) {
        resolve(res)
      }
    })
  })
  return staticBaseUrl + '/' + key
}
