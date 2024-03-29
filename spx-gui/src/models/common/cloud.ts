import * as qiniu from 'qiniu-js'
import { filename } from '@/utils/path'
import { File, toNativeFile, type Files } from './file'
import type { FileCollection, ProjectData } from '@/apis/project'
import { IsPublic, addProject, getProject, updateProject } from '@/apis/project'
import { getUpInfo as getRawUpInfo, type UpInfo as RawUpInfo } from '@/apis/util'
import { DefaultException } from '@/utils/exception'
import type { Metadata } from '../project'

export async function load(owner: string, name: string) {
  const projectData = await getProject(owner, name)
  return parseProjectData(projectData)
}

export async function save(metadata: Metadata, files: Files) {
  const { owner, name, id } = metadata
  if (owner == null) throw new Error('owner expected')
  if (!name) throw new DefaultException({ en: 'project name not specified', zh: '未指定项目名' })
  const fileUrls = await uploadFiles(files)
  const isPublic = metadata.isPublic ?? IsPublic.personal
  const projectData = await (id != null
    ? updateProject(owner, name, { isPublic, files: fileUrls })
    : addProject({ name, isPublic, files: fileUrls }))
  return parseProjectData(projectData)
}

function parseProjectData({ files: fileUrls, ...metadata }: ProjectData) {
  const files = getFiles(fileUrls)
  return { metadata, files }
}

export async function uploadFiles(files: Files): Promise<FileCollection> {
  const fileUrls: FileCollection = {}
  await Promise.all(
    Object.keys(files).map(async (path) => {
      fileUrls[path] = await uploadFile(files[path]!)
    })
  )
  return fileUrls
}

export function getFiles(fileUrls: FileCollection): Files {
  const files: Files = {}
  Object.keys(fileUrls).forEach((path) => {
    const url = fileUrls[path]
    files[path] = createFileWithUrl(filename(path), url)
  })
  return files
}

// A mark to avoid unnecessary uploading for static files
// TODO: we can apply similar strategy to json or code files
const fileUrlKey = Symbol('url')
function setUrl(file: File, url: string) {
  ;(file as any)[fileUrlKey] = url
}
function getUrl(file: File): string | null {
  return (file as any)[fileUrlKey] ?? null
}

export function createFileWithUrl(name: string, url: string) {
  const file = new File(name, async () => {
    const resp = await fetch(url)
    const blob = await resp.blob()
    return blob.arrayBuffer()
  })
  setUrl(file, url)
  return file
}

async function uploadFile(file: File) {
  const uploadedUrl = getUrl(file)
  if (uploadedUrl != null) return uploadedUrl
  const url = await upload(file)
  setUrl(file, url)
  return url
}

type QiniuUploadRes = {
  key: string
  hash: string
}

async function upload(file: File) {
  const nativeFile = await toNativeFile(file)
  const { token, baseUrl, region } = await getUpInfo()
  const observable = qiniu.upload(nativeFile, null, token, { fname: file.name }, { region: region as any })
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
  return baseUrl + '/' + key
}

type UpInfo = Omit<RawUpInfo, 'expires'> & {
  /** Expire timestamp (ms) */
	expiresAt: number
}

let upInfo: UpInfo | null = null
let fetchingUpInfo: Promise<UpInfo> | null = null

async function getUpInfo() {
  if (upInfo != null && upInfo.expiresAt > Date.now()) return upInfo
  if (fetchingUpInfo != null) return fetchingUpInfo
  return fetchingUpInfo = getRawUpInfo().then(
    ({ expires, ...others }) => {
      const bufferTime = 5 * 60 * 1000 // refresh uptoken 5min before it expires
      const expiresAt = Date.now() + (expires * 1000) - bufferTime
      upInfo = { ...others, expiresAt: expiresAt }
      fetchingUpInfo = null
      return upInfo
    }
  )
}
