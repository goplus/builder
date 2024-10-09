import { client } from './common'

export type User = {
  /** Unique identifier */
  id: string
  /** Unique username of the user */
  username: string
  /** Brief bio or description of the user */
  description: string
  /** Name to display, TODO: from Casdoor? */
  displayName: string
  /** Avatar URL, TODO: from Casdoor? */
  avatar: string
  /** Create time */
  cTime: string
  /** Update time */
  uTime: string
}

export async function getUser(name: string): Promise<User> {
  // TOOD: remove me
  if (process.env.NODE_ENV === 'development')
    return {
      id: '1',
      username: name,
      description: 'This is description of ' + name,
      displayName: name,
      avatar: 'https://avatars.githubusercontent.com/u/1492263?v=4',
      cTime: '2021-08-07T07:00:00Z',
      uTime: '2021-08-07T07:00:00Z'
    }
  return client.get(`/user/${encodeURIComponent(name)}`) as Promise<User>
}
