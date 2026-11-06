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

  it('treats standard text utilities as font sizes without colliding with text colors', () => {
    expect(cn('text-xs', 'text-lg')).toBe('text-lg')
    expect(cn('text-title', 'text-lg')).toBe('text-title text-lg')
    expect(cn('text-lg', 'text-grey-1000')).toBe('text-lg text-grey-1000')
  })

  it('merges conflicting standard text utilities in the same font-size group', () => {
    expect(cn('text-base', 'text-lg')).toBe('text-lg')
    expect(cn('text-lg', 'text-base')).toBe('text-base')
    expect(cn('text-title', 'text-base')).toBe('text-title text-base')
    expect(cn('text-base', 'text-grey-1000')).toBe('text-base text-grey-1000')
  })

  it('lets arbitrary variable text colors coexist with configured text-size utilities', () => {
    expect(cn('text-(--ui-button-color)', 'text-base')).toBe('text-(--ui-button-color) text-base')
    expect(cn('text-(--ui-button-color)', 'text-lg')).toBe('text-(--ui-button-color) text-lg')
    expect(cn('text-(--ui-button-color)', 'text-title')).toBe('text-title')
    expect(cn('text-title', 'text-(--ui-button-color)')).toBe('text-(--ui-button-color)')
  })

  it('keeps font-size and line-height conflict behavior for standard text utilities', () => {
    expect(cn('text-lg leading-6', 'text-xs')).toBe('text-xs')
    expect(cn('text-xs/6', 'text-lg')).toBe('text-lg')
  })

  it('keeps font-size and line-height conflict behavior with arbitrary text sizes', () => {
    expect(cn('text-base/[1.6]', 'text-lg')).toBe('text-lg')
    expect(cn('text-base leading-6', 'text-lg')).toBe('text-lg')
    expect(cn('text-base', 'text-base/[1.6]')).toBe('text-base/[1.6]')
    expect(cn('text-2xs', 'text-base')).toBe('text-base')
    expect(cn('text-2xs/[1.4]', 'text-base')).toBe('text-base')
  })
})
