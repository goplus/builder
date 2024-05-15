import type { FileCollection, ByPage, PaginationParams } from './common'
import { client, IsPublic } from './common'

export { IsPublic }

export enum ProjectDataType {
  Sprite = 0,
  Backdrop = 1,
  Sound = 2
}

export type ProjectData = {
  /** Globally Unique ID */
  id: string
  /** Project name, unique for projects of same owner */
  name: string
  /** Name of project owner */
  owner: string
  /** Public status */
  isPublic: IsPublic
  /** Files the project contains */
  files: FileCollection
  /** Project version */
  version: number
  /** Create time */
  cTime: string
  /** Update time */
  uTime: string
}

export type AddProjectParams = Pick<ProjectData, 'name' | 'isPublic' | 'files'>

export function addProject(params: AddProjectParams) {
  return client.post('/project', params) as Promise<ProjectData>
}

export type UpdateProjectParams = Pick<ProjectData, 'isPublic' | 'files'>

function encode(owner: string, name: string) {
  return `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

export function updateProject(owner: string, name: string, params: UpdateProjectParams) {
  return client.put(`/project/${encode(owner, name)}`, params) as Promise<ProjectData>
}

export function deleteProject(owner: string, name: string) {
  return client.delete(`/project/${encode(owner, name)}`) as Promise<void>
}

export type ListProjectParams = PaginationParams & {
  isPublic?: IsPublic
  owner?: string
}

/** `owner: ownerAll` indicates that we want to list project of all users */
export const ownerAll = '*'

export function listProject(params?: ListProjectParams) {
  return client.get('/projects/list', params) as Promise<ByPage<ProjectData>>
}

export function getProject(owner: string, name: string) {
  return client.get(`/project/${encode(owner, name)}`) as Promise<ProjectData>
}
