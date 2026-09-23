import { describe, expect, it } from 'vitest'

import { Spotlight } from '.'

describe('Spotlight', () => {
  it.each([true, false])('conceals a persistent spotlight after a click with mask %s', (mask) => {
    const element = document.createElement('button')
    document.body.append(element)
    const spotlight = new Spotlight()

    spotlight.reveal(element, { tip: 'Focus here', mask, duration: 0 })

    expect(spotlight.spotlightItem.value).toMatchObject({
      el: element,
      tip: 'Focus here',
      mask,
      timer: null
    })

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(spotlight.spotlightItem.value).toBeNull()
    spotlight.dispose()
    element.remove()
  })

  it('does not conceal a timed spotlight after a click', () => {
    const element = document.createElement('button')
    document.body.append(element)
    const spotlight = new Spotlight()

    spotlight.reveal(element, { tip: 'Focus here', mask: true, duration: 30 })
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spotlight.spotlightItem.value).not.toBeNull()
    spotlight.dispose()
    element.remove()
  })
})
