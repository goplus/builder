import { beforeEach, describe, expect, it } from 'vitest'
import { userLocalStorageRef, userSessionStorageRef } from './user-storage'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('storage bound to a determined identity', () => {
  it('restores values without writing an initialization default', () => {
    localStorage.setItem('size', JSON.stringify({ __user__: 'alice', __value__: 18 }))
    const size = userLocalStorageRef('size', 12, 'alice')
    expect(size.value).toBe(18)
    expect(JSON.parse(localStorage.getItem('size')!).__value__).toBe(18)
  })

  it('allows a signed-in user to inherit guest data', () => {
    userLocalStorageRef('size', 12, null).value = 16
    expect(userLocalStorageRef('size', 12, 'alice').value).toBe(16)
  })

  it.each([null, 'bob'])('does not expose account data to %s', (username) => {
    userLocalStorageRef('size', 12, 'alice').value = 18
    expect(userLocalStorageRef('size', 12, username).value).toBe(12)
  })

  it('keeps each writable ref bound to the identity it was created for', () => {
    const alice = userLocalStorageRef('size', 12, 'alice')
    userLocalStorageRef('size', 12, 'bob').value = 20
    alice.value = 18
    expect(JSON.parse(localStorage.getItem('size')!)).toEqual({ __user__: 'alice', __value__: 18 })
  })

  it('supports nullable values and clears the record on reset', () => {
    const course = userSessionStorageRef<{ id: string } | null>('course', null, 'alice')
    expect(course.value).toBeNull()
    course.value = { id: 'first' }
    expect(userSessionStorageRef('course', null, 'alice').value).toEqual({ id: 'first' })
    course.value = null
    expect(sessionStorage.getItem('course')).toBeNull()
  })

  it('continues to read legacy unscoped values', () => {
    localStorage.setItem('size', JSON.stringify(18))
    expect(userLocalStorageRef('size', 12, 'alice').value).toBe(18)
    expect(localStorage.getItem('size')).toBe('18')
  })
})
