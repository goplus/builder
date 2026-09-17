import { describe, expect, it } from 'vitest'

import { Spotlight } from '.'

describe('Spotlight', () => {
  it('reveals all targets and conceals a persistent spotlight after a click', () => {
    const first = document.createElement('button')
    const second = document.createElement('button')
    document.body.append(first, second)
    const spotlight = new Spotlight()

    spotlight.reveal([first, second], 'Focus here', { mask: true, duration: 0 })

    expect(spotlight.spotlightItem.value).toMatchObject({
      elements: [first, second],
      tips: 'Focus here',
      mask: true,
      timer: null
    })

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(spotlight.spotlightItem.value).toBeNull()
    spotlight.dispose()
    first.remove()
    second.remove()
  })
})
