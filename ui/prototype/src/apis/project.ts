import { projects, type Project } from '@/data/mock'

export function listProjects(): Project[] {
  return projects
}

export function getProject(owner: string, name: string): Project {
  return projects.find((project) => project.owner.username === owner && project.name === name) ?? projects[0]
}

export function getProjectRoute(project: Project): string {
  return `/project/${encodeURIComponent(project.owner.username)}/${encodeURIComponent(project.name)}`
}

export function getProjectEditorRoute(project: Project): string {
  return `/editor/${encodeURIComponent(project.owner.username)}/${encodeURIComponent(project.name)}`
}
