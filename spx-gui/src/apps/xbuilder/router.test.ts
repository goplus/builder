import { describe, expect, it } from 'vitest'
import { getHomePageRoute } from './router'

describe('getHomePageRoute', () => {
  it('opens the configured project from a preview home page', () => {
    expect(getHomePageRoute('/editor/nighca/match3/sprites/Board/code')).toMatchObject({
      path: '/',
      redirect: '/editor/nighca/match3/sprites/Board/code'
    })
  })

  it('keeps the normal home page without preview configuration', () => {
    const route = getHomePageRoute(null)
    expect(route).toMatchObject({ path: '/' })
    expect('component' in route).toBe(true)
    expect('redirect' in route).toBe(false)
  })
})
