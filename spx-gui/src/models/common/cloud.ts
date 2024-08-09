import * as qiniu from 'qiniu-js'
import { filename } from '@/utils/path'
import type { WebUrl, UniversalUrl, FileCollection } from '@/apis/common'
import type { ProjectData } from '@/apis/project'
import { IsPublic, addProject, getProject, updateProject } from '@/apis/project'
import { getUpInfo as getRawUpInfo, makeObjectUrls, type UpInfo as RawUpInfo } from '@/apis/util'
import { DefaultException } from '@/utils/exception'
import type { Metadata } from '../project'
import { File, toNativeFile, toText, type Files, isText } from './file'
import { hashFileCollection } from './hash'

// Supported universal Url schemes for files
const fileUniversalUrlSchemes = {
  // for resources stored in third-party services
  http: 'http:',
  https: 'https:',

  data: 'data:', // for inlineable data, usually plain text or json, e.g. data:text/plain,hello%20world
  kodo: 'kodo:' // for objects stored in Qiniu Kodo, e.g. kodo://bucket/key
} as const

export async function load(owner: string, name: string) {
  const projectData = await getProject(owner, name)
  return await parseProjectData(projectData)
}

export async function save(metadata: Metadata, files: Files) {
  const { owner, name, id } = metadata
  if (owner == null) throw new Error('owner expected')
  if (!name) throw new DefaultException({ en: 'project name not specified', zh: '未指定项目名' })
  const { fileCollection } = await saveFiles(files)
  const isPublic = metadata.isPublic ?? IsPublic.personal
  const projectData = await (id != null
    ? updateProject(owner, name, { isPublic, files: fileCollection })
    : addProject({ name, isPublic, files: fileCollection }))
  return { metadata: projectData, files }
}

export async function parseProjectData({ files: fileCollection, ...metadata }: ProjectData) {
  const files = await getFiles(fileCollection)
  return { metadata, files }
}

export async function saveFiles(
  files: Files
): Promise<{ fileCollection: FileCollection; fileCollectionHash: string }> {
  const fileCollection = Object.fromEntries(
    await Promise.all(
      Object.keys(files).map(async (path) => [path, await saveFile(files[path]!)] as const)
    )
  )
  const fileCollectionHash = await hashFileCollection(fileCollection)
  return { fileCollection, fileCollectionHash }
}

export async function getFiles(fileCollection: FileCollection): Promise<Files> {
  const files: Files = {}
  Object.keys(fileCollection).forEach((path) => {
    const universalUrl = fileCollection[path]
    const file = createFileWithUniversalUrl(universalUrl, filename(path))
    setUniversalUrl(file, universalUrl)
    files[path] = file
  })
  return files
}

function setUniversalUrl(file: File, url: UniversalUrl) {
  file.meta.universalUrl = url
  // for binary files stored in kodo, use universalUrl as hash to skip hash-calculating
  if (new URL(url).protocol === fileUniversalUrlSchemes.kodo && file.meta.hash == null) {
    file.meta.hash = url
  }
}
function getUniversalUrl(file: File): UniversalUrl | null {
  return file.meta.universalUrl ?? null
}

function createFileWithUniversalUrl(url: UniversalUrl, name = filename(url)) {
  return new File(name, async () => {
    const webUrl = await universalUrlToWebUrl(url)
    const resp = await fetch(webUrl)
    return resp.arrayBuffer()
  })
}

export function createFileWithWebUrl(url: WebUrl, name = filename(url)) {
  return new File(name, async () => {
    const resp = await fetch(url)
    return resp.arrayBuffer()
  })
}

export async function saveFileForWebUrl(file: File) {
  const universalUrl = await saveFile(file)
  return universalUrlToWebUrl(universalUrl)
}

async function universalUrlToWebUrl(universalUrl: UniversalUrl) {
  const { protocol } = new URL(universalUrl)
  if (protocol !== fileUniversalUrlSchemes.kodo) return universalUrl
  const map = await makeObjectUrls([universalUrl])
  return map[universalUrl]
}

async function saveFile(file: File) {
  const savedUrl = getUniversalUrl(file)
  if (savedUrl != null) return savedUrl

  const url = await (isInlineable(file) ? inlineFile(file) : uploadToKodo(file))
  setUniversalUrl(file, url)
  return url
}

const isInlineable = isText

async function inlineFile(file: File): Promise<UniversalUrl> {
  let mimeType, content
  if (isText(file)) {
    // Little trick from [https://fetch.spec.whatwg.org/#data-urls]: `12. If mimeType starts with ';', then prepend 'text/plain' to mimeType.`
    // Saves some bytes.
    mimeType = file.type === 'text/plain' ? ';' : file.type

    // TODO: Implement file compression (see https://github.com/goplus/builder/issues/492)
    content = await toText(file)
  } else {
    throw new Error('unsupported file type for inlining')
  }

  const urlEncodedContent = encodeURIComponent(content)
  return `${fileUniversalUrlSchemes.data}${mimeType},${urlEncodedContent}`
}

type KodoUploadRes = {
  key: string
  hash: string
}

async function uploadToKodo(file: File): Promise<UniversalUrl> {
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
  const { key } = await new Promise<KodoUploadRes>((resolve, reject) => {
    observable.subscribe({
      error(e) {
        reject(e)
      },
      complete(res) {
        resolve(res)
      }
    })
  })
  return `${fileUniversalUrlSchemes.kodo}//${bucket}/${key}`
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
