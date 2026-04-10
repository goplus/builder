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

  it('treats numeric text utilities as font sizes without colliding with text colors', () => {
    expect(cn('text-12', 'text-15')).toBe('text-15')
    expect(cn('text-title', 'text-15')).toBe('text-title text-15')
    expect(cn('text-15', 'text-grey-1000')).toBe('text-15 text-grey-1000')
  })

  it('treats text-body as a font-size utility without colliding with text colors', () => {
    expect(cn('text-body', 'text-15')).toBe('text-15')
    expect(cn('text-15', 'text-body')).toBe('text-body')
    expect(cn('text-title', 'text-body')).toBe('text-title text-body')
    expect(cn('text-body', 'text-grey-1000')).toBe('text-body text-grey-1000')
  })

  it('lets arbitrary variable text colors coexist with configured text-size utilities', () => {
    expect(cn('text-(--ui-button-color)', 'text-body')).toBe('text-(--ui-button-color) text-body')
    expect(cn('text-(--ui-button-color)', 'text-15')).toBe('text-(--ui-button-color) text-15')
    expect(cn('text-(--ui-button-color)', 'text-title')).toBe('text-title')
    expect(cn('text-title', 'text-(--ui-button-color)')).toBe('text-(--ui-button-color)')
  })

  it('keeps font-size and line-height conflict behavior for numeric text utilities', () => {
    expect(cn('text-15 leading-6', 'text-12')).toBe('text-12')
    expect(cn('text-12/6', 'text-15')).toBe('text-15')
  })

  it('keeps font-size and line-height conflict behavior for text-body', () => {
    expect(cn('text-body/[1.6]', 'text-15')).toBe('text-15')
    expect(cn('text-body leading-6', 'text-15')).toBe('text-15')
    expect(cn('text-body', 'text-body/[1.6]')).toBe('text-body/[1.6]')
  })
})
