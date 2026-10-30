import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeSignedInMock, makeSignedInUserQuery } from '@/stores/user/test'
import { ActionException, Cancelled } from './exception'
import { useEnsureSignedIn } from './user'

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), signIn: vi.fn() }))
let query: ReturnType<typeof makeSignedInUserQuery>
let username = ref<string | null>('alice')

vi.mock('@/stores/user', () => ({
  useSignedIn: () => Object.assign(makeSignedInMock(query, username), { signIn: mocks.signIn })
}))
vi.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (message: { en: string }) => message.en }) }))
vi.mock('@/components/ui', () => ({ useConfirmDialog: () => mocks.confirm }))

describe('useEnsureSignedIn', () => {
  beforeEach(() => {
    query = makeSignedInUserQuery(null, true)
    username = ref<string | null>('alice')
    mocks.confirm.mockReset().mockImplementation(async (options) => options.confirmHandler())
    mocks.signIn.mockReset().mockResolvedValue(null)
  })

  it('allows a locally signed-in action while user information is loading', async () => {
    await expect(useEnsureSignedIn()()).resolves.toBeUndefined()
    expect(query.data.value).toBeNull()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('prompts immediately for a locally signed-out user', async () => {
    username.value = null
    await expect(useEnsureSignedIn()()).rejects.toBeInstanceOf(Cancelled)
    expect(mocks.confirm).toHaveBeenCalledOnce()
    expect(mocks.signIn).toHaveBeenCalledOnce()
  })

  it('allows a locally signed-in action when loading user information failed', async () => {
    query.error.value = new ActionException(new TypeError('Failed to fetch'), {
      en: 'Failed to load user',
      zh: '加载用户失败'
    })
    query.isLoading.value = false
    await expect(useEnsureSignedIn()()).resolves.toBeUndefined()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
})
