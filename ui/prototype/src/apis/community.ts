import { projects, users, type Project, type UserProfile } from '@/data/mock'

export type CommunityHome = {
  mine: Project[]
  liked: Project[]
  remixing: Project[]
  following: Project[]
}

export function getCommunityHome(): CommunityHome {
  return {
    mine: projects.slice(0, 4),
    liked: projects.slice(0, 4),
    remixing: projects.slice(2, 6),
    following: projects.slice(1, 5)
  }
}

export function exploreProjects(order = 'likes'): Project[] {
  const sorted = [...projects]
  if (order === 'remix' || order === 'remixes') return sorted.sort((a, b) => b.remixes - a.remixes)
  if (order === 'following' || order === 'latest') return sorted.reverse()
  return sorted.sort((a, b) => b.likes - a.likes)
}

export function searchCommunity(keyword: string): Project[] {
  const normalized = keyword.trim().toLowerCase()
  if (normalized === '') return projects
  return projects.filter((project) =>
    [project.title, project.description, project.owner.displayName, ...project.tags].some((value) =>
      value.toLowerCase().includes(normalized)
    )
  )
}

export function getUserProfile(username: string): UserProfile {
  return users.find((user) => user.username === username) ?? users[0]
}

export function listUserProjects(username: string): Project[] {
  const owned = projects.filter((project) => project.owner.username === username)
  return owned.length > 0 ? owned : projects.slice(0, 3)
}

export function listUserLikes(username: string): Project[] {
  const offset = users.findIndex((user) => user.username === username)
  return projects.slice(Math.max(0, offset), Math.max(4, offset + 4))
}

export function listFollowers(username: string): UserProfile[] {
  return users.filter((user) => user.username !== username)
}

export function listFollowing(username: string): UserProfile[] {
  return [...users].reverse().filter((user) => user.username !== username)
}
