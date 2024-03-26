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

/** Map from relative path to URL */
export type FileUrls = {
  [path: string]: string
}

export const client = new Client()
