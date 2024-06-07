import { Client } from './client'

export type PaginationParams = {
  pageSize?: number
  pageIndex?: number
}

export type ByPage<T> = {
  total: number
  data: T[]
}

export const OwnerAll = '*'

export enum IsPublic {
  personal = 0,
  public = 1
}

/** Url with 'http://' or 'https://' scheme, used for web resources */
export type WebUrl = string

/** Url for universal resources, which could be either a WebUrl or a Url with a custom scheme like 'kodo://' */
export type UniversalUrl = string

/** Map from UniversalUrl to WebUrl */
export type UniversalToWebUrlMap = {
  [universalUrl: UniversalUrl]: WebUrl
}

/** Map from relative path to UniversalUrl */
export type FileCollection = {
  [path: string]: UniversalUrl
}

export const client = new Client()
