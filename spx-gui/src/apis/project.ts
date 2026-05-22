import dayjs from 'dayjs'
import type { FileCollection, ByPage, PaginationParams, Perspective, ArtStyle } from './common'
import { client, Visibility, timeStringify } from './common'
import { ApiException, ApiExceptionCode, type MovedResourceCanonical } from './common/exception'
import { parseProjectReleaseFullName, stringifyProjectReleaseFullName, type ProjectRelease } from './project-release'
import type { Prettify } from '@/utils/types'

export { Visibility }

export enum ProjectType {
  /** 2D game project based on spx. */
  Game = 'game'
}

export function isSupportedProjectType(type: string | null | undefined): boolean {
  return type === ProjectType.Game
}

/** Source of extra settings of the project. */
export const enum ProjectExtraSettingsSource {
  /** Settings generated automatically by the system (e.g., via AI analysis). */
  Auto = 'auto',
  /** Settings provided or adjusted manually by the user. */
  Manual = 'manual'
}

/**
 * Extra settings of the project.
 * It may include graphic settings and other settings (e.g., lore, genre, audio style) in the future.
 */
export type ProjectExtraSettings = {
  /** Source of settings */
  source?: ProjectExtraSettingsSource
  /** Art style indicates the visual style or aesthetic approach used in the creation of graphics */
  artStyle?: ArtStyle
  /** Perspective indicates the viewpoint from which the "game world" is viewed */
  perspective?: Perspective
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
  remixedFrom: string | null
  /** Latest release of the project */
  latestRelease: ProjectRelease | null
  /** Unique name of the project */
  name: string
  /** Type of the project */
  type: ProjectType
  /** Display name of the project */
  displayName: string
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
  /** Extra settings of the project */
  extraSettings: ProjectExtraSettings
  /** Universal URL of the project's thumbnail image, may be empty (`""`) */
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

export type AddProjectByRemixParams = Prettify<
  Pick<ProjectData, 'name' | 'visibility' | 'type'> &
    Partial<Pick<ProjectData, 'displayName'>> & {
      /** Full name of the project or project release to remix from. */
      remixSource: string
    }
>

export type AddProjectParams = Prettify<
  Pick<ProjectData, 'name' | 'files' | 'visibility' | 'thumbnail' | 'type'> & Partial<Pick<ProjectData, 'displayName'>>
>

export function addProject(params: AddProjectParams | AddProjectByRemixParams, signal?: AbortSignal) {
  return client.post('/user/projects', params, { signal }) as Promise<ProjectData>
}

export type UpdateProjectParams = Prettify<
  Partial<
    Pick<
      ProjectData,
      'files' | 'visibility' | 'name' | 'displayName' | 'description' | 'instructions' | 'thumbnail' | 'extraSettings'
    >
  >
>

export function updateProject(owner: string, name: string, params: UpdateProjectParams, signal?: AbortSignal) {
  return updateProjectOnce(owner, name, params, signal).catch((err) => {
    const movedProjectIdentifier = getMovedProjectIdentifier(err)
    if (movedProjectIdentifier == null) throw err

    const { owner: canonicalOwner, name: canonicalName } = movedProjectIdentifier
    if (canonicalOwner === owner && canonicalName === name) throw err

    return updateProjectOnce(canonicalOwner, canonicalName, params, signal)
  })
}

function updateProjectOnce(owner: string, name: string, params: UpdateProjectParams, signal?: AbortSignal) {
  return client.patch(`/projects/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, params, {
    signal
  }) as Promise<ProjectData>
}

function getMovedProjectIdentifier(err: unknown): { owner: string; name: string } | null {
  if (!(err instanceof ApiException) || err.code !== ApiExceptionCode.errorResourceMoved) return null
  if (err.meta == null || typeof err.meta !== 'object') return null
  const { owner, name } = err.meta as Partial<MovedResourceCanonical>
  if (!owner || !name) return null
  return { owner, name }
}

export function deleteProject(owner: string, name: string) {
  return client.delete(`/projects/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`) as Promise<void>
}

type ListProjectsOrderBy =
  | 'createdAt'
  | 'updatedAt'
  | 'likeCount'
  | 'remixCount'
  | 'recentLikeCount'
  | 'recentRemixCount'

type ListProjectsBaseParams = PaginationParams & {
  /** Filter remixed projects by the full name of the source project or project release */
  remixedFrom?: string
  /** Filter projects by display name or name pattern */
  keyword?: string
  /** Filter projects by type */
  type?: ProjectType
  /** Filter projects that were created after this timestamp */
  createdAfter?: string
  /** Filter projects that gained new likes after this timestamp */
  likesReceivedAfter?: string
  /** Filter projects that were remixed after this timestamp */
  remixesReceivedAfter?: string
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export type ListProjectsParams = ListProjectsBaseParams & {
  /** Filter projects by visibility */
  visibility?: Visibility
  /** If filter projects created by followees of logged-in user */
  fromFollowees?: boolean
  /** Field by which to order the results */
  orderBy?: ListProjectsOrderBy
}

export type ListSignedInUserProjectsParams = ListProjectsBaseParams & {
  /** Filter projects by visibility */
  visibility?: Visibility
  /** Field by which to order the results */
  orderBy?: ListProjectsOrderBy
}

export type ListUserPublicProjectsParams = ListProjectsBaseParams & {
  /** Field by which to order the results */
  orderBy?: ListProjectsOrderBy
}

export type ListUserLikedProjectsParams = ListProjectsBaseParams & {
  /** Field by which to order the results */
  orderBy?: ListProjectsOrderBy | 'likedAt'
}

export function listProjects(params?: ListProjectsParams) {
  return client.get('/projects', params) as Promise<ByPage<ProjectData>>
}

export function listSignedInUserProjects(params?: ListSignedInUserProjectsParams) {
  return client.get('/user/projects', params) as Promise<ByPage<ProjectData>>
}

export function listUserPublicProjects(username: string, params?: ListUserPublicProjectsParams) {
  return client.get(`/users/${encodeURIComponent(username)}/projects`, params) as Promise<ByPage<ProjectData>>
}

export function listUserLikedProjects(username: string, params?: ListUserLikedProjectsParams) {
  return client.get(`/users/${encodeURIComponent(username)}/liked-projects`, params) as Promise<ByPage<ProjectData>>
}

export function getProject(owner: string, name: string, signal?: AbortSignal) {
  return client.get(`/projects/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, undefined, {
    signal
  }) as Promise<ProjectData>
}

export async function isProjectNameTaken(owner: string, name: string, signal?: AbortSignal) {
  try {
    const project = await getProject(owner, name, signal)
    return project.owner.toLowerCase() === owner.toLowerCase() && project.name.toLowerCase() === name.toLowerCase()
  } catch (e) {
    if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) return false
    throw e
  }
}

export enum ExploreOrder {
  MostLikes = 'likes',
  MostRemixes = 'remix',
  FollowingCreated = 'following'
}

export type ExploreParams = {
  order: ExploreOrder
  count: number
  type: ProjectType
}

/** Get project list for explore purpose */
export async function exploreProjects({ order, count, type }: ExploreParams) {
  // count within the last 6 months
  const countAfter = timeStringify(dayjs().subtract(6, 'month').valueOf())
  const p: ListProjectsParams = {
    visibility: Visibility.Public,
    type,
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
  const listResult = await listProjects(p)
  return listResult.data
}

/** Record a view for the given project */
export function recordProjectView(owner: string, name: string) {
  return client.post(`/projects/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/views`) as Promise<void>
}

/**
 * Check if given project liked by current logged-in user.
 * If not logged in, `false` will be returned.
 */
export async function isLiking(owner: string, name: string) {
  try {
    await client.get(`/user/liked-projects/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`)
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

export function likeProject(owner: string, name: string) {
  return client.put(`/user/liked-projects/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`) as Promise<void>
}

export function unlikeProject(owner: string, name: string) {
  return client.delete(`/user/liked-projects/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`) as Promise<void>
}

export function parseProjectFullName(fullName: string) {
  const [encodedOwner, encodedProject] = fullName.split('/')
  const owner = decodeURIComponent(encodedOwner)
  const project = decodeURIComponent(encodedProject)
  return { owner, project }
}

export function stringifyProjectFullName(owner: string, project: string) {
  const encodedOwner = encodeURIComponent(owner)
  const encodedProject = encodeURIComponent(project)
  return `${encodedOwner}/${encodedProject}`
}

export function parseRemixSource(rs: string) {
  return rs.split('/').length === 3 ? parseProjectReleaseFullName(rs) : parseProjectFullName(rs)
}

export function stringifyRemixSource(owner: string, project: string, release?: string) {
  return release != null
    ? stringifyProjectReleaseFullName(owner, project, release)
    : stringifyProjectFullName(owner, project)
}
