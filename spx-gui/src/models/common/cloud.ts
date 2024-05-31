import * as qiniu from 'qiniu-js'
import { filename } from '@/utils/path'
import { File, toNativeFile, type Files } from './file'
import type { ProjectData } from '@/apis/project'
import { IsPublic, addProject, getProject, updateProject } from '@/apis/project'
import { getUpInfo as getRawUpInfo, type UpInfo as RawUpInfo, makeObjectUrls } from '@/apis/util'
import { DefaultException } from '@/utils/exception'
import type { Metadata } from '../project'
import type { WebUrl, UniversalUrl, FileCollection } from '@/apis/common'

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
  const { fileCollection } = await uploadFiles(files)
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

export async function uploadFiles(
  files: Files
): Promise<{ fileCollection: FileCollection; fileCollectionHash: string }> {
  const fileCollection: FileCollection = {}
  const entries = await Promise.all(
    Object.keys(files).map(async (path) => [path, await uploadFile(files[path]!)] as const)
  )
  for (const [path, url] of entries) {
    fileCollection[path] = url
  }
  const fileCollectionHash = await hashFiles(fileCollection)
  return { fileCollection, fileCollectionHash }
}

export async function hashFiles(fileCollection: FileCollection): Promise<string> {
  // Sort fileCollection alphabetically by path to ensure consistent hash
  const sortedFileCollection = Object.fromEntries(
    Object.entries(fileCollection).sort(([pathA], [pathB]) =>
      pathA < pathB ? -1 : pathA > pathB ? 1 : 0
    )
  )
  const data = new TextEncoder().encode(JSON.stringify(sortedFileCollection))
  const hash = await crypto.subtle.digest('SHA-1', data)
  const hashB64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(hash))))
  const fileCollectionHash = 'h1:' + hashB64
  return fileCollectionHash
}

export async function getFiles(fileCollection: FileCollection): Promise<Files> {
  const objects = Object.values(fileCollection).filter((url) => url.startsWith(kodoScheme))
  const { objectUrls } = await makeObjectUrls(objects)

  // FIXME: Remove legacyObjects related code after migration is done
  const legacyKodoUrlPrefix = 'https://builder-static-test.goplus.org/'
  const legacyObjects = Object.values(fileCollection)
    .filter((url) => url.startsWith(legacyKodoUrlPrefix))
    .map(
      (url) =>
        kodoScheme +
        'goplus-builder-static-test/' +
        url.slice(legacyKodoUrlPrefix.length).split('?')[0]
    )
  const { objectUrls: legacyObjectUrls } = await makeObjectUrls(legacyObjects)

  const files: Files = {}
  Object.keys(fileCollection).forEach((path) => {
    const universalUrl = fileCollection[path]
    let webUrl = universalUrl
    if (universalUrl.startsWith(kodoScheme)) {
      webUrl = objectUrls[universalUrl]
    } else if (universalUrl.startsWith(legacyKodoUrlPrefix)) {
      webUrl =
        legacyObjectUrls[
          kodoScheme +
            'goplus-builder-static-test/' +
            universalUrl.slice(legacyKodoUrlPrefix.length).split('?')[0]
        ]
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
