import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeSignedInMock, makeSignedInState, makeSignedInStateQuery } from '@/stores/user/test'
import { ActionException, Cancelled } from './exception'
import { useEnsureSignedIn } from './user'

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), signIn: vi.fn() }))
let query: ReturnType<typeof makeSignedInStateQuery>

vi.mock('@/stores/user', () => ({
  useSignedIn: () => Object.assign(makeSignedInMock(query), { signIn: mocks.signIn })
}))
vi.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (message: { en: string }) => message.en }) }))
vi.mock('@/components/ui', () => ({ useConfirmDialog: () => mocks.confirm }))

describe('useEnsureSignedIn', () => {
  beforeEach(() => {
    query = makeSignedInStateQuery(null)
    mocks.confirm.mockReset().mockImplementation(async (options) => options.confirmHandler())
    mocks.signIn.mockReset().mockResolvedValue(null)
  })

  it('waits for authentication before allowing a signed-in action', async () => {
    const pending = useEnsureSignedIn()()
    await flushPromises()
    expect(mocks.confirm).not.toHaveBeenCalled()
    query.data.value = makeSignedInState('alice')
    query.isLoading.value = false
    await expect(pending).resolves.toBeUndefined()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('prompts for sign-in only after a signed-out result', async () => {
    const pending = useEnsureSignedIn()()
    const rejected = expect(pending).rejects.toBeInstanceOf(Cancelled)
    await flushPromises()
    expect(mocks.confirm).not.toHaveBeenCalled()
    query.data.value = makeSignedInState(null)
    query.isLoading.value = false
    await rejected
    expect(mocks.confirm).toHaveBeenCalledOnce()
    expect(mocks.signIn).toHaveBeenCalledOnce()
  })

  it('propagates authentication errors without prompting for sign-in', async () => {
    const error = new ActionException(new TypeError('Failed to fetch'), {
      en: 'Failed to load user',
      zh: '加载用户失败'
    })
    const pending = useEnsureSignedIn()()
    const rejected = expect(pending).rejects.toBe(error)
    query.error.value = error
    query.isLoading.value = false
    await rejected
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(mocks.signIn).not.toHaveBeenCalled()
  })
})
