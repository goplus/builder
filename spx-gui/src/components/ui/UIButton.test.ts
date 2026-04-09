import { describe, expect, it } from 'vitest'

import { buttonRecipe, resolveButtonCssVars } from './UIButton.vue'

describe('buttonRecipe', () => {
  it('uses the documented defaults', () => {
    const classes = buttonRecipe()

    expect(classes.root()).toContain('pb-1')
    expect(classes.content()).toContain('bg-(--ui-button-bg-color)')
    expect(classes.content()).toContain('text-(color:--ui-button-color)')
    expect(classes.icon()).toContain('size-[14px]')
  })

  it('applies flat and stroke icon size overrides for medium and large buttons', () => {
    expect(buttonRecipe({ variant: 'flat', size: 'medium' }).icon()).toContain('size-4')
    expect(buttonRecipe({ variant: 'stroke', size: 'large' }).icon()).toContain('size-5')
  })

  it('applies loading and disabled compound variants', () => {
    const loadingClasses = buttonRecipe({ variant: 'shadow', loading: true })
    const disabledClasses = buttonRecipe({ variant: 'shadow', disabled: true, loading: false })

    expect(loadingClasses.root()).toContain('pb-0')
    expect(loadingClasses.content()).toContain('shadow-none')
    expect(disabledClasses.root()).toContain('enabled:active:pb-0')
    expect(disabledClasses.content()).toContain('bg-(--ui-button-bg-color)')
  })

  it('lets root extras stay at the layout layer', () => {
    const classes = buttonRecipe({ iconOnly: true, shape: 'circle' })

    expect(classes.root('w-full')).toContain('aspect-square')
    expect(classes.root('w-full')).toContain('w-full')
    expect(classes.content()).toContain('rounded-full')
    expect(classes.content()).toContain('px-0')
  })

  it('merges external root classes with twMerge semantics', () => {
    const classes = buttonRecipe({ size: 'medium', shape: 'square' })
    const merged = classes.root(['mt-4 h-9 rounded-full'])

    expect(merged).toContain('mt-4')
    expect(merged).toContain('h-9')
    expect(merged).toContain('rounded-full')
    expect(merged).not.toContain('h-(--ui-line-height-2)')
    expect(merged).not.toContain('rounded-2')
  })

  it('accepts booleans for boolean-like variants', () => {
    expect(buttonRecipe({ loading: false, disabled: false }).root()).toContain('pb-1')
    expect(buttonRecipe({ loading: true }).root()).toContain('pb-0')
    expect(buttonRecipe({ iconOnly: true }).root()).toContain('aspect-square')
  })

  it('resolves button css vars directly for template styles', () => {
    expect(resolveButtonCssVars({ color: 'primary', disabled: false, loading: false })).toEqual({
      '--ui-button-color': 'var(--ui-color-grey-100)',
      '--ui-button-bg-color': 'var(--ui-color-primary-main)',
      '--ui-button-hover-bg-color': 'var(--ui-color-primary-400)',
      '--ui-button-shadow-color': 'var(--ui-color-primary-700)',
      '--ui-button-stroke-color': 'var(--ui-color-grey-400)'
    })

    expect(resolveButtonCssVars({ color: 'danger', disabled: true, loading: false })).toEqual({
      '--ui-button-color': 'var(--ui-color-disabled-text)',
      '--ui-button-bg-color': 'var(--ui-color-disabled-bg)',
      '--ui-button-hover-bg-color': 'var(--ui-color-disabled-bg)',
      '--ui-button-shadow-color': 'var(--ui-color-grey-500)',
      '--ui-button-stroke-color': 'var(--ui-color-grey-400)'
    })

    expect(resolveButtonCssVars({ color: 'danger', disabled: true, loading: true })).toEqual({
      '--ui-button-color': 'var(--ui-color-grey-100)',
      '--ui-button-bg-color': 'var(--ui-color-danger-main)',
      '--ui-button-hover-bg-color': 'var(--ui-color-danger-400)',
      '--ui-button-shadow-color': 'var(--ui-color-danger-600)',
      '--ui-button-stroke-color': 'var(--ui-color-grey-400)'
    })
  })
})
