import { ref, shallowRef } from 'vue'
import { vi } from 'vitest'
import type { ActionException } from '@/utils/exception'
import type { QueryRet } from '@/utils/query'
import type { SignedInState, SignedInUser } from './signed-in'

function createSignedInUser(username: string): SignedInUser {
  return {
    id: 'user-id',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    username,
    displayName: username,
    avatar: '',
    description: '',
    plan: 'free',
    capabilities: {
      canManageAssets: false,
      canManageCourses: false,
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
