import { projects, type Project } from '@/data/mock'

export function listProjects(): Project[] {
  return projects
}

export function getProject(owner: string, name: string): Project {
  return projects.find((project) => project.owner.username === owner && project.name === name) ?? projects[0]
}

export function listRelatedProjects(project: Project): Project[] {
  return projects.filter((item) => item.id !== project.id).slice(0, 4)
}

export function toggleProjectLike(project: Project, liked: boolean): Project {
  project.likes = liked ? project.likes + 1 : Math.max(0, project.likes - 1)
  return project
}

export function getProjectRoute(project: Project): string {
  return `/project/${encodeURIComponent(project.owner.username)}/${encodeURIComponent(project.name)}`
}

export function getProjectEditorRoute(project: Project): string {
  return `/editor/${encodeURIComponent(project.owner.username)}/${encodeURIComponent(project.name)}`
}
