import dayjs from 'dayjs'
import type { FileCollection, ByPage, PaginationParams } from './common'
import { client, Visibility, ownerAll, timeStringify } from './common'
import { ApiException, ApiExceptionCode } from './common/exception'

export { Visibility, ownerAll }

export enum ProjectDataType {
  Sprite = 0,
  Backdrop = 1,
  Sound = 2
}

export type ProjectData = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Unique username of the user */
  owner: string
  /** Full name of the project release from which the project is remixed */
  remixedFrom: string
  /** Unique name of the project */
  name: string
  /** Version number of the project */
  version: number
  /** File paths and their corresponding universal URLs associated with the project */
  files: FileCollection
  /** Visibility of the project */
  visibility: Visibility
  /** Brief description of the project */
  description: string
  /** Instructions on how to interact with the project */
  instructions: string
  /** Universal URL of the project's thumbnail image */
  thumbnail: string
  /** Number of times the project has been viewed */
  viewCount: number
  /** Number of likes the project has received */
  likeCount: number
  /** Number of releases associated with the project */
  releaseCount: number
  /** Number of remixes associated with the project */
  remixCount: number
}

export type AddProjectByRemixParams = Pick<ProjectData, 'name' | 'visibility'> & {
  /** Full name of the project or project release to remix from. */
  remixSource: string
}

export type AddProjectParams = Pick<ProjectData, 'name' | 'files' | 'visibility'>

export async function addProject(
  params: AddProjectParams | AddProjectByRemixParams,
  signal?: AbortSignal
) {
  return client.post('/project', params, { signal }) as Promise<ProjectData>
}

export type UpdateProjectParams = Pick<ProjectData, 'files' | 'visibility'> &
  Partial<Pick<ProjectData, 'description' | 'instructions' | 'thumbnail'>>

export async function updateProject(
  owner: string,
  name: string,
  params: UpdateProjectParams,
  signal?: AbortSignal
) {
  return client.put(`/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, params, {
    signal
  }) as Promise<ProjectData>
}

export function deleteProject(owner: string, name: string) {
  return client.delete(
    `/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
  ) as Promise<void>
}

export type ListProjectParams = PaginationParams & {
  /**
   * Filter projects by the owner's username.
   * Defaults to the authenticated user if not specified. Use * to include projects from all users.
   **/
  owner?: string
  /** Filter remixed projects by the full name of the source project or project release */
  remixedFrom?: string
  /** Filter projects by name pattern */
  keyword?: string
  /** Filter projects by visibility */
  visibility?: Visibility
  /** Filter projects liked by the specified user */
  liker?: string
  /** Filter projects that were created after this timestamp */
  createdAfter?: string
  /** Filter projects that gained new likes after this timestamp */
  likesReceivedAfter?: string
  /** Filter projects that were remixed after this timestamp */
  remixesReceivedAfter?: string
  /** If filter projects created by followees of logged-in user */
  fromFollowees?: boolean
  /** Field by which to order the results */
  orderBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'likeCount'
    | 'remixCount'
    | 'recentLikeCount'
    | 'recentRemixCount'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export async function listProject(params?: ListProjectParams) {
  return client.get('/projects/list', params) as Promise<ByPage<ProjectData>>
}

export async function getProject(owner: string, name: string, signal?: AbortSignal) {
  return client.get(
    `/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    undefined,
    { signal }
  ) as Promise<ProjectData>
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
    visibility: Visibility.Public,
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
      p.orderBy = 'createdAt'
      p.sortOrder = 'desc'
      break
  }
  const listResult = await listProject(p)
  return listResult.data
}

/** Record a view for the given project */
export async function recordProjectView(owner: string, name: string) {
  return client.post(
    `/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/view`
  ) as Promise<void>
}

/**
 * Check if given project liked by current logged-in user.
 * If not logged in, `false` will be returned.
 */
export async function isLiking(owner: string, name: string) {
  try {
    await client.get(`/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/liking`)
    return true
  } catch (e) {
    if (e instanceof ApiException) {
      // Not liked.
      if (e.code === ApiExceptionCode.errorNotFound) return false
      // Not logged in.
      if (e.code === ApiExceptionCode.errorUnauthorized) return false
      throw e
    }
    throw e
  }
}

export async function likeProject(owner: string, name: string) {
  return client.post(
    `/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/liking`
  ) as Promise<void>
}

export async function unlikeProject(owner: string, name: string) {
  return client.delete(
    `/project/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/liking`
  ) as Promise<void>
}

export type RemixSource = [owner: string, project: string, release?: string]

export function parseRemixSource(rs: string) {
  const [owner, project, release = null] = rs.split('/')
  return { owner, project, release }
}

export function stringifyRemixSource(owner: string, project: string, release?: string) {
  return [owner, project, release].filter((s) => s != null).join('/')
}
