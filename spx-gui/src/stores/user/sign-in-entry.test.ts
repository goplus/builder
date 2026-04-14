import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProviderParams, getDefaultReturnTo, getSignInRoute, normalizeSafeReturnTo } from './sign-in-entry'

describe('sign-in-entry', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        origin: 'https://xbuilder.com',
        pathname: '/project/alice/demo',
        search: '?tab=play',
        hash: '#runner'
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    })
  })

  it('keeps safe internal return targets', () => {
    expect(normalizeSafeReturnTo('/editor/alice/demo?publish#share')).toBe('/editor/alice/demo?publish#share')
  })

  it('rejects unsafe return targets', () => {
    expect(normalizeSafeReturnTo('https://evil.example')).toBe('/')
    expect(normalizeSafeReturnTo('//evil.example')).toBe('/')
    expect(normalizeSafeReturnTo('editor/alice/demo')).toBe('/')
  })

  it('builds the default return target from the current location', () => {
    expect(getDefaultReturnTo()).toBe('/project/alice/demo?tab=play#runner')
  })

  it('builds a sign-in route with an encoded safe return target', () => {
    expect(getSignInRoute('/project/alice/demo?tab=play#runner')).toBe(
      '/sign-in?returnTo=%2Fproject%2Falice%2Fdemo%3Ftab%3Dplay%23runner'
    )
  })

  it('returns null provider params when a provider is not configured', () => {
    expect(buildProviderParams({ providerParamName: 'provider', providerValue: '' })).toBeNull()
  })

  it('builds provider params when name and value are configured', () => {
    expect(buildProviderParams({ providerParamName: 'provider', providerValue: 'wechat' })).toEqual({
      provider: 'wechat'
    })
  })
})
