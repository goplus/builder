import { computed, ref, shallowRef, type Ref } from 'vue'
import { vi } from 'vitest'
import { OAuthFlow } from '@/utils/oauth'
import type { ActionException } from '@/utils/exception'
import type { QueryRet } from '@/utils/query'
import type { SignedIn, SignedInState, SignedInUser } from './signed-in'

function createSignedInUser(username: string): SignedInUser {
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

export function makeSignedInState(username: string | null): SignedInState {
  if (username == null) {
    return {
      isSignedIn: false,
      user: null
    }
  }
  return {
    isSignedIn: true,
    user: createSignedInUser(username)
  }
}

export function makeSignedInStateQuery(initialState: SignedInState | null): QueryRet<SignedInState> {
  return {
    isLoading: ref(initialState == null),
    data: shallowRef(initialState),
    error: shallowRef<ActionException | null>(null),
    progress: shallowRef({ percentage: 0, timeLeft: null, desc: null }),
    refetch: vi.fn()
  }
}

export function makeSignedInMock(
  state = makeSignedInStateQuery(null),
  username: Readonly<Ref<string | null>> = computed(() => state.data.value?.user?.username ?? null)
): Pick<SignedIn, 'state' | 'isSignedIn' | 'username' | 'user' | 'signIn' | 'canUseAdminConsole'> {
  const signedIn = computed(() => username.value != null)
  return {
    state,
    isSignedIn: () => signedIn.value,
    get username() {
      return username.value
    },
    get user() {
      return state.data.value?.user ?? null
    },
    signIn: vi.fn(),
    canUseAdminConsole: () =>
      state.data.value?.user?.capabilities.canManageAccount === true ||
      state.data.value?.user?.capabilities.canManageAuthorization === true
  }
}

export function mockCompleteSignIn(signedIn: SignedIn, accessToken: string) {
  vi.spyOn(OAuthFlow.prototype, 'completeAuthorization').mockResolvedValueOnce({
    token: { access_token: accessToken, refresh_token: `${accessToken}-refresh`, expires_in: 3600 },
    extraData: { returnTo: '/' }
  })
  return signedIn.completeSignIn('?code=test&state=test')
}
