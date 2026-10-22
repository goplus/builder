import { describe, expect, it, vi } from 'vitest'
import type { ProjectSerialized } from '@/models/project'
import { LocalCache } from './local-cache'

function setup() {
  const entries = new Map<string, ProjectSerialized>()
  const helpers = {
    load: vi.fn(async (key: string) => entries.get(key) ?? null),
    save: vi.fn(async (key: string, value: ProjectSerialized) => {
      entries.set(key, value)
    }),
    clear: vi.fn(async (key: string) => {
      entries.delete(key)
    })
  }
  const cache = (account: string, owner: string, name: string) => {
    const result = new LocalCache(helpers, () => account)
    result.setProject(owner, name)
    return result
  }
  return { entries, helpers, cache }
}

describe('Project local cache', () => {
  it('isolates drafts across projects and accounts, including clearing another project cache', async () => {
    const { cache } = setup()
    const first = cache('test', 'author', 'Ninja-Fight')
    const otherProject = cache('test', 'test', 'FeedbackE2E')
    const otherAccount = cache('another-user', 'author', 'Ninja-Fight')
    const draft = { metadata: { owner: 'author', name: 'Ninja-Fight' }, files: {} }
    await first.save(draft)
    expect(await otherProject.load()).toBeNull()
    expect(await otherAccount.load()).toBeNull()
    await otherProject.save({ metadata: { owner: 'test', name: 'FeedbackE2E' }, files: {} })
    await otherProject.clear()
    expect(await cache('test', 'author', 'Ninja-Fight').load()).toBe(draft)
  })

  it('uses the current account after signing in or switching accounts', async () => {
    const { helpers, cache } = setup()
    let account: string | null = null
    const current = new LocalCache(helpers, () => account)
    current.setProject('author', 'Ninja-Fight')
    const draft = { metadata: { owner: 'author', name: 'Ninja-Fight' }, files: {} }
    await current.save(draft)
    account = 'test'
    expect(await current.load()).toBeNull()
    await current.save(draft)
    expect(await cache('test', 'author', 'Ninja-Fight').load()).toBe(draft)
    account = 'another-user'
    expect(await current.load()).toBeNull()
  })

  it('migrates only the signed-in account’s matching legacy cache', async () => {
    const { cache, entries } = setup()
    const legacy = { metadata: { owner: 'test', name: 'MyGame' }, files: {} }
    entries.set('XBUILDER_CACHED_PROJECT', legacy)
    expect(await cache('another-user', 'test', 'MyGame').load()).toBeNull()
    expect(await cache('test', 'test', 'OtherGame').load()).toBeNull()
    expect(entries.get('XBUILDER_CACHED_PROJECT')).toBe(legacy)
    expect(await cache('test', 'test', 'MyGame').load()).toBe(legacy)
    expect(entries.has('XBUILDER_CACHED_PROJECT')).toBe(false)
    expect(await cache('test', 'test', 'MyGame').load()).toBe(legacy)
  })
})
