import { afterEach, describe, expect, it } from 'vitest'
import { resolveTriggerElement } from './trigger'

describe('resolveTriggerElement', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('resolves a component root comment anchor to the following Element', () => {
    const container = document.createElement('div')
    const anchor = document.createComment('leading template comment')
    const trigger = document.createElement('button')

    container.append(anchor, trigger)
    document.body.append(container)

    expect(resolveTriggerElement({ $el: anchor })).toBe(trigger)
  })

  it('resolves SVG component roots directly as trigger elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    expect(resolveTriggerElement({ $el: svg })).toBe(svg)
  })

  it('does not resolve descendants for non-anchor component roots', () => {
    const documentFragment = document.createDocumentFragment()
    const trigger = document.createElement('button')

    documentFragment.append(trigger)

    expect(resolveTriggerElement({ $el: documentFragment })).toBeNull()
  })
})
