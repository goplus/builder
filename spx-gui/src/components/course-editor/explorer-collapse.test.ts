import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCollapsedNodes } from './explorer-collapse'

vi.mock('@/stores/user', () => ({ getUnresolvedSignedInUsername: () => 'alice' }))

describe('folded rows of the course explorer', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('starts with every row open', () => {
    const { collapsed } = useCollapsedNodes()

    expect(collapsed.value.size).toBe(0)
  })

  it('folds a row and opens it again', () => {
    const { collapsed, toggle } = useCollapsedNodes()

    toggle('assets/videos')
    expect(collapsed.value.has('assets/videos')).toBe(true)

    toggle('assets/videos')
    expect(collapsed.value.has('assets/videos')).toBe(false)
  })

  it('leaves the other rows as they are', () => {
    const { collapsed, toggle } = useCollapsedNodes()

    toggle('assets/videos')
    toggle('group:unused')
    toggle('assets/videos')

    expect([...collapsed.value]).toEqual(['group:unused'])
  })

  it('keeps folded rows folded for the next course and after a reload', () => {
    useCollapsedNodes().toggle('assets/images')

    // What a reload, or opening another course, gets: a reader that has not seen the toggle.
    expect([...useCollapsedNodes().collapsed.value]).toEqual(['assets/images'])
  })
})
