import { client, type ByPage, type FileCollection, type PaginationParams } from './common'

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
  /** rief description of the release. */
  description: string
  /** File paths and their corresponding universal URLs associated with the release. */
  files: FileCollection
  /** Universal URL of the release's thumbnail image. */
  thumbnail: string
  /** Number of times the release has been remixed. */
  remixCount: number
}

export type CreateReleaseParams = Pick<
  ProjectRelease,
  'projectFullName' | 'name' | 'description' | 'thumbnail'
>

export function createRelease(params: CreateReleaseParams) {
  return client.post('/project-release', params) as Promise<ProjectRelease>
}

export type ListReleasesParams = PaginationParams & {
  projectFullName?: string
  orderBy?: 'createdAt' | 'updatedAt' | 'remixCount'
  sortOrder?: 'asc' | 'desc'
}

export function listReleases(params: ListReleasesParams, signal?: AbortSignal) {
  return client.get(`/project-releases/list`, params, { signal }) as Promise<ByPage<ProjectRelease>>
}

export async function getLatestRelease(owner: string, projectName: string, signal?: AbortSignal) {
  const listResult = await listReleases(
    {
      projectFullName: `${owner}/${projectName}`,
      orderBy: 'createdAt',
      sortOrder: 'desc',
      pageSize: 1
    },
    signal
  )
  if (listResult.total === 0) return null
  return listResult.data[0]
}
