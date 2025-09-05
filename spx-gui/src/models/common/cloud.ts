import * as qiniu from 'qiniu-js'
import { usercontentBaseUrl } from '@/utils/env'
import { filename } from '@/utils/path'
import { humanizeFileSize } from '@/utils/utils'
import { selectFile, selectFiles, type FileSelectOptions } from '@/utils/file'
import type { WebUrl, UniversalUrl, FileCollection, UniversalToWebUrlMap } from '@/apis/common'
import type { ProjectData } from '@/apis/project'
import { Visibility, addProject, getProject, updateProject } from '@/apis/project'
import { getUpInfo, makeObjectUrls, type UpInfo as RawUpInfo } from '@/apis/util'
import { DefaultException } from '@/utils/exception'
import type { Metadata } from '../project'
import { File, toNativeFile, toText, type Files, isText } from './file'
import { hashFileCollection } from './hash'
import { createAIDescriptionFiles, extractAIDescription } from './'

// Supported universal Url schemes for files
const fileUniversalUrlSchemes = {
  // for resources stored in third-party services
  http: 'http:',
  https: 'https:',

  data: 'data:', // for inlineable data, usually plain text or json, e.g. data:text/plain,hello%20world
  kodo: 'kodo:' // for objects stored in Qiniu Kodo, e.g. kodo://bucket/key
} as const

export async function load(owner: string, name: string, preferPublishedContent: boolean = false, signal?: AbortSignal) {
  let projectData = await getProject(owner, name, signal)
  if (preferPublishedContent) {
    const published = getPublishedContent(projectData)
    if (published != null) {
      projectData = {
        ...projectData,
        thumbnail: published.thumbnail,
        files: published.files
      }
    }
  }
  return parseProjectData(projectData)
}

export function getPublishedContent(project: ProjectData) {
  // "published content" is the latest release of a public project
  if (project.visibility === Visibility.Public && project.latestRelease != null) return project.latestRelease
  return null
}

export async function save(metadata: Metadata, files: Files, signal?: AbortSignal) {
  const { owner, name, id } = metadata
  if (owner == null) throw new Error('owner expected')
  if (!name) throw new DefaultException({ en: 'project name not specified', zh: '未指定项目名' })

  const aiDescriptionFiles = createAIDescriptionFiles(metadata)
  const filesToSave = { ...files, ...aiDescriptionFiles }

  const [{ fileCollection }, thumbnailUniversalUrl] = await Promise.all([
    saveFiles(filesToSave, signal),
    metadata.thumbnail == null ? '' : await saveFile(metadata.thumbnail, signal)
  ])
  signal?.throwIfAborted()

  const visibility = metadata.visibility ?? Visibility.Private
  const {
    files: _files,
    thumbnail,
    ...savedMetadata
  } = await (id != null
    ? updateProject(
        owner,
        name,
        {
          visibility,
          files: fileCollection,
          description: metadata.description,
          instructions: metadata.instructions,
          thumbnail: thumbnailUniversalUrl
        },
        signal
      )
    : addProject({ name, visibility, thumbnail: thumbnailUniversalUrl, files: fileCollection, mobileKeyboardType: 1 }, signal))
  signal?.throwIfAborted()

  metadata = { ...savedMetadata, thumbnail: metadata.thumbnail }
  return { metadata, files }
}

async function parseProjectData({ files: fileCollection, thumbnail: thumbnailUniversalUrl, ...extra }: ProjectData) {
  const files = getFiles(fileCollection)
  const thumbnail = thumbnailUniversalUrl === '' ? null : createFileWithUniversalUrl(thumbnailUniversalUrl)
  const { aiDescription, aiDescriptionHash } = await extractAIDescription(files)

  const metadata: Metadata = { ...extra, thumbnail, aiDescription, aiDescriptionHash }
  return { metadata, files }
}

export async function saveFiles(
  files: Files,
  signal?: AbortSignal
): Promise<{ fileCollection: FileCollection; fileCollectionHash: string }> {
  const fileCollection = Object.fromEntries(
    await Promise.all(Object.keys(files).map(async (path) => [path, await saveFile(files[path]!, signal)] as const))
  )
  const fileCollectionHash = await hashFileCollection(fileCollection)
  return { fileCollection, fileCollectionHash }
}

export function getFiles(fileCollection: FileCollection): Files {
  const files: Files = {}
  Object.keys(fileCollection).forEach((path) => {
    const universalUrl = fileCollection[path]
    const file = createFileWithUniversalUrl(universalUrl, filename(path))
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

export function createFileWithUniversalUrl(url: UniversalUrl, name = filename(url)) {
  const file = new File(name, async () => {
    const webUrl = await universalUrlToWebUrl(url)
    const resp = await fetch(webUrl)
    return resp.arrayBuffer()
  })
  setUniversalUrl(file, url)
  return file
}

export function createFileWithWebUrl(url: WebUrl, name = filename(url)) {
  return new File(name, async () => {
    const resp = await fetch(url)
    return resp.arrayBuffer()
  })
}

export async function saveFileForWebUrl(file: File, signal?: AbortSignal) {
  const universalUrl = await saveFile(file, signal)
  return universalUrlToWebUrl(universalUrl)
}

export const universalUrlToWebUrl = (() => {
  const cache = (() => {
    type Entry = { webUrl: WebUrl; cachedAt: number }
    const entries = new Map<UniversalUrl, Entry>()
    const ttl = 60 * 60 * 1000 // 1 hour in milliseconds
    const isFresh = (entry: Entry) => Date.now() - entry.cachedAt < ttl
    return {
      get: (universalUrl: UniversalUrl) => {
        const entry = entries.get(universalUrl)
        if (entry != null) {
          if (isFresh(entry)) return entry.webUrl
          entries.delete(universalUrl)
        }
        return null
      },
      set: (universalUrl: UniversalUrl, webUrl: WebUrl) => entries.set(universalUrl, { webUrl, cachedAt: Date.now() }),
      clear: () => entries.clear()
    }
  })()

  const makeObjectUrl = (() => {
    const batch = new Set<UniversalUrl>()
    const batchDelay = 15 // 15ms
    let batchPromise: Promise<UniversalToWebUrlMap> | null = null
    const processBatch = () => {
      const currentBatch = Array.from(batch)
      batch.clear()
      batchPromise = null
      return makeObjectUrls(currentBatch)
    }
    return async (universalUrl: UniversalUrl) => {
      batch.add(universalUrl)
      if (batchPromise == null) {
        batchPromise = new Promise((resolve) => setTimeout(() => resolve(processBatch()), batchDelay))
      }
      const objectUrls = await batchPromise
      return objectUrls[universalUrl]
    }
  })()

  const fn = async (universalUrl: UniversalUrl): Promise<WebUrl> => {
    const { protocol } = new URL(universalUrl)
    if (protocol !== fileUniversalUrlSchemes.kodo) return universalUrl

    const cached = cache.get(universalUrl)
    if (cached != null) return cached

    const webUrl = await makeObjectUrl(universalUrl)
    if (!webUrl.startsWith(usercontentBaseUrl)) {
      console.warn(`\
Expect webUrl (${webUrl}) to start with usercontentBaseUrl (${usercontentBaseUrl}). \
The env variable \`VITE_USERCONTENT_BASE_URL\` may be misconfigured. \
See details in file \`.env\`.
`)
    }
    cache.set(universalUrl, webUrl)
    return webUrl
  }
  fn.clearCache = cache.clear
  return fn
})()

/** Save file to cloud and return its universal URL */
export async function saveFile(file: File, signal?: AbortSignal) {
  const savedUrl = getUniversalUrl(file)
  if (savedUrl != null) return savedUrl

  const url = await ((await isInlineable(file)) ? inlineFile(file) : uploadToKodo(file, signal))
  setUniversalUrl(file, url)
  return url
}

async function isInlineable(file: File) {
  const maxInlineSize = 10 * 1024 // 10 KB threshold
  if (!isText(file)) return false
  const arrayBuffer = await file.arrayBuffer()
  return arrayBuffer.byteLength <= maxInlineSize
}

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

async function uploadToKodo(file: File, signal?: AbortSignal): Promise<UniversalUrl> {
  const nativeFile = await toNativeFile(file)
  const { token, maxSize, bucket, region } = await getUpInfoWithCache()
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
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const subscription = observable.subscribe({
      error(e) {
        reject(e)
      },
      complete(res) {
        resolve(res)
      }
    })
    signal?.addEventListener('abort', () => {
      subscription.unsubscribe()
      reject(signal.reason)
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

async function getUpInfoWithCache() {
  if (upInfo != null && upInfo.expiresAt > Date.now()) return upInfo
  if (fetchingUpInfo != null) return fetchingUpInfo
  return (fetchingUpInfo = getUpInfo().then(({ expires, ...others }) => {
    const bufferTime = 5 * 60 * 1000 // refresh uptoken 5min before it expires
    const expiresAt = Date.now() + expires * 1000 - bufferTime
    upInfo = { ...others, expiresAt: expiresAt }
    fetchingUpInfo = null
    return upInfo
  }))
}

async function validateFileSizeForUpload(files: globalThis.File[]) {
  const upInfo = await getUpInfoWithCache()
  const oversizedFileNames = Array.from(files!)
    .filter((file) => file.size > upInfo.maxSize)
    .map((file) => file.name)
  if (oversizedFileNames.length > 0) {
    const maxSizeText = humanizeFileSize(upInfo.maxSize)
    throw new DefaultException({
      en: `File ${oversizedFileNames.join(', ')} size exceeds limit (max ${maxSizeText.en})`,
      zh: `文件 ${oversizedFileNames.join('、')} 尺寸超限（最大 ${maxSizeText.zh}）`
    })
  }
}

export async function selectFileWithUploadLimit(options: FileSelectOptions) {
  const file = await selectFile(options)
  await validateFileSizeForUpload([file])
  return file
}

export async function selectFilesWithUploadLimit(options: FileSelectOptions) {
  const files = await selectFiles(options)
  await validateFileSizeForUpload(files)
  return files
}
