import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { computed, createApp, ref, shallowRef, type Ref } from 'vue'
import { vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { until } from '@/utils/utils'
import { OAuthFlow } from '@/utils/oauth'
import type { ActionException } from '@/utils/exception'
import { initSignedIn, type SignedIn, type SignedInUser, type SignedInOptions } from './signed-in'

export function makeSignedInUser(username: string | null): SignedInUser | null {
  if (username == null) return null
  return {
    id: 'user-id',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    username,
    displayName: username,
    avatar: 'https://example.com/avatar.png',
    description: '',
    plan: 'free',
    capabilities: {
      canManageAccount: false,
      canManageAuthorization: false,
      canManageAssets: false,
      canManageCourses: false,
      canManageFeedback: false,
      canUsePremiumLLM: false
    }
  }
}

export function makeSignedInUserQuery(initialUser: SignedInUser | null, isLoading = false) {
  return {
    isLoading: ref(isLoading),
    data: shallowRef(initialUser),
    error: shallowRef<ActionException | null>(null)
  }
}

export function makeSignedInMock(
  userQuery = makeSignedInUserQuery(null, true),
  username: Readonly<Ref<string | null>> = computed(() => userQuery.data.value?.username ?? null)
): Pick<SignedIn, 'getUser' | 'user' | 'isSignedIn' | 'username' | 'signIn' | 'canUseAdminConsole'> {
  const signedIn = computed(() => username.value != null)
  return {
    getUser: async ({ signal } = {}) => {
      void userQuery.data.value
      await until(() => !userQuery.isLoading.value, signal)
      if (userQuery.error.value != null) throw userQuery.error.value
      return userQuery.data.value
    },
    get user() {
      return userQuery.data.value
    },
    get isSignedIn() {
      return signedIn.value
    },
    get username() {
      return username.value
    },
    signIn: vi.fn(),
    get canUseAdminConsole() {
      return (
        userQuery.data.value?.capabilities.canManageAccount === true ||
        userQuery.data.value?.capabilities.canManageAuthorization === true
      )
    }
  }
}

export function mockCompleteSignIn(signedIn: SignedIn, accessToken: string) {
  vi.spyOn(OAuthFlow.prototype, 'completeAuthorization').mockResolvedValueOnce({
    token: { access_token: accessToken, refresh_token: `${accessToken}-refresh`, expires_in: 3600 },
    extraData: { returnTo: '/' }
  })
  return signedIn.completeSignIn('?code=test&state=test')
}

export function createSignedIn(options: SignedInOptions) {
  const app = createApp({})
  app.use(createI18n({ lang: 'en' }))
  app.use(VueQueryPlugin, { queryClient: new QueryClient() })
  return initSignedIn(app, options)
}
