import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import UIButton, { buttonRecipe, resolveButtonCssVars } from './UIButton.vue'

describe('buttonRecipe', () => {
  it('uses the documented defaults', () => {
    const classes = buttonRecipe()

    expect(classes.root()).toContain('h-8')
    expect(classes.root()).toContain('rounded-md')
    expect(classes.root()).toContain('text-(--ui-button-color)')
    expect(classes.root()).toContain('bg-(--ui-button-bg-color)')
    expect(classes.root()).toContain('border-(--ui-button-border-color)')
    expect(classes.icon()).toContain('size-4')
  })

  it('applies circle and square icon geometry overrides by size', () => {
    const circleClasses = buttonRecipe({ shape: 'circle', size: 'large' })
    const squareClasses = buttonRecipe({ shape: 'square', size: 'small' })

    expect(circleClasses.root()).toContain('aspect-square')
    expect(circleClasses.root()).toContain('p-0')
    expect(circleClasses.icon()).toContain('size-5')

    expect(squareClasses.root()).toContain('aspect-square')
    expect(squareClasses.root()).toContain('p-0')
    expect(squareClasses.icon()).toContain('size-[13px]')
  })

  it('merges external root classes with twMerge semantics', () => {
    const classes = buttonRecipe({ size: 'medium', shape: 'default' })
    const merged = classes.root(['mt-4 h-9 rounded-full'])

    expect(merged).toContain('mt-4')
    expect(merged).toContain('h-9')
    expect(merged).toContain('rounded-full')
    expect(merged).not.toContain('h-8')
    expect(merged).not.toContain('rounded-md')
  })

  it('resolves button css vars directly for template styles', () => {
    expect(resolveButtonCssVars({ type: 'primary', disabled: false, loading: false })).toEqual({
      '--ui-button-color': 'var(--ui-color-grey-100)',
      '--ui-button-bg-color': 'var(--ui-color-primary-500)',
      '--ui-button-border-color': 'transparent',
      '--ui-button-hover-bg-color': 'var(--ui-color-primary-400)',
      '--ui-button-hover-border-color': 'transparent',
      '--ui-button-active-bg-color': 'var(--ui-color-primary-600)',
      '--ui-button-active-border-color': 'transparent',
      '--ui-button-focus-border-color': 'var(--ui-color-primary-700)'
    })

    expect(resolveButtonCssVars({ type: 'neutral', disabled: true, loading: false })).toEqual({
      '--ui-button-color': 'var(--ui-color-disabled-text)',
      '--ui-button-bg-color': 'var(--ui-color-disabled-bg)',
      '--ui-button-border-color': 'var(--ui-color-grey-400)',
      '--ui-button-hover-bg-color': 'var(--ui-color-disabled-bg)',
      '--ui-button-hover-border-color': 'var(--ui-color-grey-400)',
      '--ui-button-active-bg-color': 'var(--ui-color-disabled-bg)',
      '--ui-button-active-border-color': 'var(--ui-color-grey-400)',
      '--ui-button-focus-border-color': 'var(--ui-color-grey-400)'
    })

    expect(resolveButtonCssVars({ type: 'red', disabled: true, loading: true })).toEqual({
      '--ui-button-color': 'var(--ui-color-grey-100)',
      '--ui-button-bg-color': 'var(--ui-color-red-500)',
      '--ui-button-border-color': 'transparent',
      '--ui-button-hover-bg-color': 'var(--ui-color-red-500)',
      '--ui-button-hover-border-color': 'transparent',
      '--ui-button-active-bg-color': 'var(--ui-color-red-500)',
      '--ui-button-active-border-color': 'transparent',
      '--ui-button-focus-border-color': 'transparent'
    })
  })

  it('uses primary and default as the public prop defaults', () => {
    const wrapper = mount(UIButton, {
      props: {
        icon: 'play'
      }
    })

    expect(wrapper.classes()).toContain('rounded-md')
    expect(wrapper.classes()).not.toContain('aspect-square')
    expect(wrapper.attributes('style') ?? '').toContain('--ui-button-bg-color: var(--ui-color-primary-500)')
  })

  it('uses type for the design color variants', () => {
    const wrapper = mount(UIButton, {
      props: {
        type: 'red'
      },
      slots: {
        default: 'Delete'
      }
    })

    expect(wrapper.attributes('style') ?? '').toContain('--ui-button-bg-color: var(--ui-color-red-500)')
  })

  it('keeps root attrs on the native button while merging external classes with twMerge semantics', () => {
    const wrapper = mount(UIButton, {
      props: {
        class: 'mt-4 h-9 rounded-full'
      },
      attrs: {
        'data-test-id': 'ui-button',
        tabindex: '-1'
      },
      slots: {
        default: 'Click'
      }
    })

    expect(wrapper.classes()).toContain('mt-4')
    expect(wrapper.classes()).toContain('h-9')
    expect(wrapper.classes()).toContain('rounded-full')
    expect(wrapper.classes()).not.toContain('h-8')
    expect(wrapper.classes()).not.toContain('rounded-md')
    expect(wrapper.attributes('data-test-id')).toBe('ui-button')
    expect(wrapper.attributes('tabindex')).toBe('-1')
  })
})
