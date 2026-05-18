import { signedInUsername, users, type UserProfile } from '@/data/mock'

export function getSignedInUser(): UserProfile {
  return getUserProfile(signedInUsername)
}

export function isSignedInUser(username: string): boolean {
  return username === signedInUsername
}

export function getUserProfile(username: string): UserProfile {
  return users.find((user) => user.username === username) ?? users[0]
}

export function listFollowers(username: string): UserProfile[] {
  return users.filter((user) => user.username !== username)
}

export function listFollowing(username: string): UserProfile[] {
  return [...users].reverse().filter((user) => user.username !== username)
}
