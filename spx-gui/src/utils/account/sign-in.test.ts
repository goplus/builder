import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildIdentityProviderAuthorizeUrl,
  buildOAuthAuthorizeUrl,
  clearPendingAuthorization,
  hasPendingAuthorization,
  markPendingAuthorization,
  parseOAuthContext,
  type OAuthContext
} from './sign-in'

describe('account-web sign-in utils', () => {
  const context: OAuthContext = {
    clientId: 'xbuilder',
    requestUri: 'urn:example:request:123'
  }

  beforeEach(() => {
    sessionStorage.clear()
    window.history.replaceState({}, '', '/sign-in?clientID=xbuilder&requestURI=urn%3Aexample%3Arequest%3A123')
  })

  it('parses oauth context from the current location', () => {
    expect(parseOAuthContext()).toEqual(context)
  })

  it('builds account authorize URLs against a relative facade base URL', () => {
    expect(buildOAuthAuthorizeUrl(context)).toBe(
      'http://localhost:3000/api/oauth/authorize?client_id=xbuilder&request_uri=urn%3Aexample%3Arequest%3A123'
    )
    expect(buildIdentityProviderAuthorizeUrl('github', context)).toBe(
      'http://localhost:3000/api/identity-providers/github/authorize?clientID=xbuilder&requestURI=urn%3Aexample%3Arequest%3A123'
    )
  })

  it('tracks pending authorization by oauth flow', () => {
    expect(hasPendingAuthorization(context)).toBe(false)
    markPendingAuthorization(context)
    expect(hasPendingAuthorization(context)).toBe(true)
    clearPendingAuthorization(context)
    expect(hasPendingAuthorization(context)).toBe(false)
  })
})
