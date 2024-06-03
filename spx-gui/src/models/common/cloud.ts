import * as qiniu from 'qiniu-js'
import { filename } from '@/utils/path'
import { File, toNativeFile, type Files } from './file'
import type { ProjectData } from '@/apis/project'
import { IsPublic, addProject, getProject, updateProject } from '@/apis/project'
import { getUpInfo as getRawUpInfo, type UpInfo as RawUpInfo, makeObjectUrls } from '@/apis/util'
import { DefaultException } from '@/utils/exception'
import type { Metadata } from '../project'
import type { WebUrl, UniversalUrl, UniversalToWebUrlMap, FileCollection } from '@/apis/common'

// See https://github.com/goplus/builder/issues/411 for all the supported schemes, future plans, and discussions.
const kodoScheme = 'kodo://'

export async function load(owner: string, name: string) {
  const projectData = await getProject(owner, name)
  return await parseProjectData(projectData)
}

export async function save(metadata: Metadata, files: Files) {
  const { owner, name, id } = metadata
  if (owner == null) throw new Error('owner expected')
  if (!name) throw new DefaultException({ en: 'project name not specified', zh: '未指定项目名' })
  const fileCollection = await uploadFiles(files)
  const isPublic = metadata.isPublic ?? IsPublic.personal
  const projectData = await (id != null
    ? updateProject(owner, name, { isPublic, files: fileCollection })
    : addProject({ name, isPublic, files: fileCollection }))
  return await parseProjectData(projectData)
}

export async function parseProjectData({ files: fileCollection, ...metadata }: ProjectData) {
  const files = await getFiles(fileCollection)
  return { metadata, files }
}

export async function uploadFiles(files: Files): Promise<FileCollection> {
  const fileCollection: FileCollection = {}
  const entries = await Promise.all(
    Object.keys(files).map(async (path) => [path, await uploadFile(files[path]!)] as const)
  )
  for (const [path, url] of entries) {
    fileCollection[path] = url
  }
  return fileCollection
}

export async function getFiles(fileCollection: FileCollection): Promise<Files> {
  let objectUrls: UniversalToWebUrlMap = {}
  const objectUniversalUrls = Object.values(fileCollection).filter((url) =>
    url.startsWith(kodoScheme)
  )
  if (objectUniversalUrls.length) {
    const result = await makeObjectUrls(objectUniversalUrls)
    objectUrls = result.objectUrls
  }

  const files: Files = {}
  Object.keys(fileCollection).forEach((path) => {
    const universalUrl = fileCollection[path]
    let webUrl = universalUrl

    const objectUrl = objectUrls[universalUrl]
    if (objectUrl) {
      webUrl = objectUrl
    }

    const file = createFileWithWebUrl(filename(path), webUrl)
    setUniversalUrl(file, universalUrl)
    files[path] = file
  })
  return files
}

// A mark to avoid unnecessary uploading for static files
// TODO: we can apply similar strategy to json or code files
const fileUrlKey = Symbol('url')
function setUniversalUrl(file: File, url: UniversalUrl) {
  ;(file as any)[fileUrlKey] = url
}
function getUniversalUrl(file: File): UniversalUrl | null {
  return (file as any)[fileUrlKey] ?? null
}

export function createFileWithWebUrl(name: string, webUrl: WebUrl) {
  return new File(name, async () => {
    const resp = await fetch(webUrl)
    const blob = await resp.blob()
    return blob.arrayBuffer()
  })
}

async function uploadFile(file: File) {
  const uploadedUrl = getUniversalUrl(file)
  if (uploadedUrl != null) return uploadedUrl
  const url = await uploadToKodo(file)
  setUniversalUrl(file, url)
  return url
}

type QiniuUploadRes = {
  key: string
  hash: string
}

async function uploadToKodo(file: File) {
  const nativeFile = await toNativeFile(file)
  const { token, maxSize, bucket, region } = await getUpInfo()
  if (nativeFile.size > maxSize) throw new Error(`file size exceeds the limit (${maxSize} bytes)`)
  const observable = qiniu.upload(
    nativeFile,
    null,
    token,
    {
      fname: file.name,
      mimeType: file.type === '' ? undefined : file.type
    },
    { region: region as any }
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
  return (kodoScheme + bucket + '/' + key) as UniversalUrl
}

type UpInfo = Omit<RawUpInfo, 'expires'> & {
  /** Timestamp (ms) after which the uptoken is considered expired */
  expiresAt: number
}

let upInfo: UpInfo | null = null
let fetchingUpInfo: Promise<UpInfo> | null = null

async function getUpInfo() {
  if (upInfo != null && upInfo.expiresAt > Date.now()) return upInfo
  if (fetchingUpInfo != null) return fetchingUpInfo
  return (fetchingUpInfo = getRawUpInfo().then(({ expires, ...others }) => {
    const bufferTime = 5 * 60 * 1000 // refresh uptoken 5min before it expires
    const expiresAt = Date.now() + expires * 1000 - bufferTime
    upInfo = { ...others, expiresAt: expiresAt }
    fetchingUpInfo = null
    return upInfo
  }))
}
