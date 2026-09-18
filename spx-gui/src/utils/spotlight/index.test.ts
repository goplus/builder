import { describe, expect, it } from 'vitest'

import { Spotlight } from '.'

describe('Spotlight', () => {
  it('conceals a persistent spotlight after a click', () => {
    const element = document.createElement('button')
    document.body.append(element)
    const spotlight = new Spotlight()

    spotlight.reveal(element, 'Focus here', { mask: true, duration: 0 })

    expect(spotlight.spotlightItem.value).toMatchObject({
      el: element,
      tips: 'Focus here',
      mask: true,
      timer: null
    })

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(spotlight.spotlightItem.value).toBeNull()
    spotlight.dispose()
    element.remove()
  })
})
