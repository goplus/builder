import type { TutorialProject, TutorialProjectSerialized } from '@/models/tutorial/project'

/** Which explorer documents hold changes not saved yet. */
export type DirtyDocs = {
  info: boolean
  program: boolean
  /** The videos folder: a video was added, removed, renamed or replaced. */
  videos: boolean
  /** Ids of the individual videos that changed. */
  videoIds: Set<string>
  project: boolean
}

export type DocsBaseline = {
  title: string
  thumbnail: string
  config: string
  code: string
  videos: Map<string, { name: string; file: unknown }>
  /** The embedded project's memoized export: a new object appears on every change. */
  projectFiles: unknown
}

/**
 * Capture what the documents look like when they are considered saved. `saved` is the snapshot that was just
 * uploaded, if any; the embedded project's export identity is read from the live project right away, which is
 * exact unless it was edited while the save was in flight (then the project simply keeps its mark).
 */
export function takeDocsBaseline(project: TutorialProject, saved?: TutorialProjectSerialized): DocsBaseline {
  return {
    title: saved?.metadata.title ?? project.title,
    thumbnail: saved?.metadata.thumbnail ?? project.thumbnail,
    config: JSON.stringify(project.config),
    code: project.mainCourse.code,
    videos: new Map(project.videos.map((video) => [video.id, { name: video.name, file: video.file }])),
    projectFiles: project.project.exportFiles()
  }
}

export function getDirtyDocs(project: TutorialProject, baseline: DocsBaseline): DirtyDocs {
  const videoIds = new Set<string>()
  for (const video of project.videos) {
    const saved = baseline.videos.get(video.id)
    if (saved == null || saved.name !== video.name || saved.file !== video.file) videoIds.add(video.id)
  }
  const removed = [...baseline.videos.keys()].some((id) => !project.videos.some((video) => video.id === id))
  return {
    info:
      project.title !== baseline.title ||
      project.thumbnail !== baseline.thumbnail ||
      JSON.stringify(project.config) !== baseline.config,
    program: project.mainCourse.code !== baseline.code,
    videos: videoIds.size > 0 || removed,
    videoIds,
    project: project.project.exportFiles() !== baseline.projectFiles
  }
}
