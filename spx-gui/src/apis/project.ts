import dayjs from 'dayjs'
import type { FileCollection, ByPage, PaginationParams } from './common'
import { client, IsPublic, ownerAll, timeStringify } from './common'
import { ApiException, ApiExceptionCode } from './common/exception'

export { IsPublic, ownerAll }

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
  /** Full name of the project release from which the project is remixed */
  remixedFrom: string
  /** Brief description of the project */
  description: string
  /** Instructions on how to interact with the project */
  instructions: string
  /** URL of the project's thumbnail image */
  thumbnail: string
  /** Number of times the project has been viewed */
  viewCount: number
  /** Number of likes the project has received */
  likeCount: number
  /** Number of releases associated with the project */
  releaseCount: number
  /** Number of remixes associated with the project */
  remixCount: number
  /** Create time */
  cTime: string
  /** Update time */
  uTime: string
}

// TODO: remove me
function __adaptProjectData(p: unknown): ProjectData {
  function rand(decimals: number) {
    return Math.floor(Math.pow(10, Math.random() * decimals))
  }
  const project = p as Omit<
    ProjectData,
    | 'remixedFrom'
    | 'description'
    | 'instructions'
    | 'thumbnail'
    | 'viewCount'
    | 'likeCount'
    | 'releaseCount'
    | 'remixCount'
  >
  return {
    ...project,
    remixedFrom: `${project.owner}/${project.name}/0`,
    description: `This is description of ${project.name}`,
    instructions: `This is instructions of ${project.name}`,
    thumbnail: 'https://github.com/user-attachments/assets/d5032bf5-dbb0-4a17-a46d-8d41ce14f595',
    viewCount: rand(7),
    likeCount: rand(6),
    releaseCount: rand(2),
    remixCount: rand(2)
  }
}

export type AddProjectParams = Pick<ProjectData, 'name' | 'isPublic' | 'files'>

export async function addProject(params: AddProjectParams, signal?: AbortSignal) {
  return __adaptProjectData(await client.post('/project', params, { signal }))
}

export type UpdateProjectParams = Pick<ProjectData, 'isPublic' | 'files'>

function encode(owner: string, name: string) {
  return `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

export async function updateProject(
  owner: string,
  name: string,
  params: UpdateProjectParams,
  signal?: AbortSignal
) {
  return __adaptProjectData(await client.put(`/project/${encode(owner, name)}`, params, { signal }))
}

export function deleteProject(owner: string, name: string) {
  return client.delete(`/project/${encode(owner, name)}`) as Promise<void>
}

export type ListProjectParams = PaginationParams & {
  isPublic?: IsPublic
  /** Name of project owner, `*` indicates projects of all users */
  owner?: string
  /** Filter projects by name pattern */
  keyword?: string
  /** Filter projects that were created after this timestamp */
  createdAfter?: string
  /** Filter projects that gained new likes after this timestamp */
  likesReceivedAfter?: string
  /** Filter projects that were remixed after this timestamp */
  remixesReceivedAfter?: string
  /** If filter projects created by followees of logged-in user */
  fromFollowees?: boolean
  /** Field by which to order the results */
  orderBy?: 'cTime' | 'uTime' | 'likeCount' | 'remixCount' | 'recentLikeCount' | 'recentRemixCount'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export async function listProject(params?: ListProjectParams) {
  const { total, data } = await (client.get('/projects/list', params) as Promise<
    ByPage<ProjectData>
  >)
  return {
    total,
    data: data.map(__adaptProjectData)
  }
}

export async function getProject(owner: string, name: string) {
  return __adaptProjectData(await client.get(`/project/${encode(owner, name)}`))
}

export enum ExploreOrder {
  MostLikes = 'likes',
  MostRemixes = 'remix',
  FollowingCreated = 'following'
}

export type ExploreParams = {
  order: ExploreOrder
  count: number
}

/** Get project list for explore purpose */
export async function exploreProjects({ order, count }: ExploreParams) {
  // count within the last month
  const countAfter = timeStringify(dayjs().subtract(1, 'month').valueOf())
  const p: ListProjectParams = {
    isPublic: IsPublic.public,
    owner: ownerAll,
    pageSize: count,
    pageIndex: 1
  }
  switch (order) {
    case ExploreOrder.MostLikes:
      p.likesReceivedAfter = countAfter
      p.orderBy = 'recentLikeCount'
      p.sortOrder = 'desc'
      break
    case ExploreOrder.MostRemixes:
      p.remixesReceivedAfter = countAfter
      p.orderBy = 'recentRemixCount'
      p.sortOrder = 'desc'
      break
    case ExploreOrder.FollowingCreated:
      p.fromFollowees = true
      p.createdAfter = countAfter
      p.orderBy = 'cTime'
      p.sortOrder = 'desc'
      break
  }
  const listResult = await listProject(p)
  return listResult.data
}

/**
 * Check if given project liked by current logged-in user.
 * If not logged in, `false` will be returned.
 */
export async function isLiking(owner: string, name: string) {
  // TOOD: remove me
  if (process.env.NODE_ENV === 'development') return Math.random() > 0.5
  try {
    await client.get(`/project/liking/${encode(owner, name)}`)
    return true
  } catch (e) {
    if (e instanceof ApiException) {
      // Not liked. TODO: reconfirm value of `code` here
      if (e.code === ApiExceptionCode.errorNotFound) return false
      // Not logged in.
      if (e.code === ApiExceptionCode.errorUnauthorized) return false
      throw e
    }
    throw e
  }
}
