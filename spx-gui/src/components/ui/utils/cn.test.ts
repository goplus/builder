import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('flattens nested class values and skips absent ones', () => {
    expect(cn('px-4', ['text-white', null, ['bg-primary-main', { 'font-bold': true, hidden: false }]], false)).toBe(
      'px-4 text-white bg-primary-main font-bold'
    )
  })

  it('merges conflicting tailwind classes by keeping the later value', () => {
    const merged = cn('px-4 rounded-md', 'px-2', ['rounded-full'])

    expect(merged).toContain('px-2')
    expect(merged).not.toContain('px-4')
    expect(merged).not.toContain('rounded-md')
    expect(merged).toContain('rounded-full')
  })
})
