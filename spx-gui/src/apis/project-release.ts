import { client, type ByPage, type FileCollection, type PaginationParams } from './common'

export const projectReleaseDescriptionMaxLength = 400

export type ProjectRelease = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Full name of the project, in the format `owner/project`. */
  projectFullName: string
  /** Unique name of the project release, adhering to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). */
  name: string
  /** Brief description of the release. */
  description: string
  /** File paths and their corresponding universal URLs associated with the release. */
  files: FileCollection
  /** Universal URL of the release's thumbnail image. */
  thumbnail: string
  /** Number of times the release has been remixed. */
  remixCount: number
}

export type CreateProjectReleaseParams = Pick<ProjectRelease, 'name' | 'description' | 'thumbnail'>

export function createProjectRelease(
  owner: string,
  project: string,
  params: CreateProjectReleaseParams,
  signal?: AbortSignal
) {
  return client.post(`/projects/${encodeURIComponent(owner)}/${encodeURIComponent(project)}/releases`, params, {
    signal
  }) as Promise<ProjectRelease>
}

export type ListProjectReleasesParams = PaginationParams & {
  orderBy?: 'createdAt' | 'updatedAt' | 'remixCount'
  sortOrder?: 'asc' | 'desc'
}

export function listProjectReleases(
  owner: string,
  project: string,
  params?: ListProjectReleasesParams,
  signal?: AbortSignal
) {
  return client.get(`/projects/${encodeURIComponent(owner)}/${encodeURIComponent(project)}/releases`, params, {
    signal
  }) as Promise<ByPage<ProjectRelease>>
}

export function parseProjectReleaseFullName(fullName: string) {
  const [encodedOwner, encodedProject, encodedRelease] = fullName.split('/')
  const owner = decodeURIComponent(encodedOwner)
  const project = decodeURIComponent(encodedProject)
  const release = decodeURIComponent(encodedRelease)
  return { owner, project, release }
}

export function stringifyProjectReleaseFullName(owner: string, project: string, release: string) {
  const encodedOwner = encodeURIComponent(owner)
  const encodedProject = encodeURIComponent(project)
  const encodedRelease = encodeURIComponent(release)
  return `${encodedOwner}/${encodedProject}/${encodedRelease}`
}
