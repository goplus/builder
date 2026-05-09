import { describe, expect, it } from 'vitest'

import { createRecipe } from './create-recipe'

const buttonRecipe = createRecipe({
  slots: { root: 'inline-flex', content: 'px-4 py-2', icon: 'size-4' },
  variants: {
    size: {
      small: { content: 'px-2 text-xs', icon: 'size-[13px]' },
      large: { content: 'px-6 text-lg', icon: 'size-[18px]' }
    },
    variant: {
      solid: { content: 'bg-primary-main text-white' },
      stroke: { content: 'border border-border bg-white text-text' }
    },
    iconOnly: {
      true: { root: 'aspect-square', content: 'px-0' },
      false: null
    }
  },
  defaultVariants: { size: 'small', variant: 'solid', iconOnly: false },
  compoundVariants: [
    { when: { variant: 'stroke', size: ['small', 'large'] }, class: { icon: 'size-[16px]' } },
    { when: { variant: 'solid', iconOnly: true }, class: { content: 'rounded-full' } }
  ]
})

describe('createRecipe', () => {
  it('applies default variants and preserves per-slot extra classes', () => {
    const classes = buttonRecipe()
    expect(classes.root('w-full')).toBe('inline-flex w-full')
    expect(classes.content()).toBe('py-2 px-2 text-xs bg-primary-main text-white')
    expect(classes.icon()).toBe('size-[13px]')
  })

  it('applies compound variants for matched combinations', () => {
    const classes = buttonRecipe({ size: 'large', variant: 'stroke' })
    expect(classes.content()).toBe('py-2 px-6 text-lg border border-border bg-white text-text')
    expect(classes.icon()).toBe('size-[16px]')
  })

  it('lets slot extras override resolved classes at the end', () => {
    const classes = buttonRecipe({ iconOnly: true })
    expect(classes.root()).toBe('inline-flex aspect-square')
    expect(classes.content('px-1')).toBe('py-2 text-xs bg-primary-main text-white rounded-full px-1')
  })

  it('accepts boolean values in variant selection and conditions', () => {
    const classes = buttonRecipe({ iconOnly: false })

    expect(classes.root()).toBe('inline-flex')
    expect(buttonRecipe({ iconOnly: true }).content()).toContain('rounded-full')
  })
})
