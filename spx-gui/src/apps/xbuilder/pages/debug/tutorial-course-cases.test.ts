import { describe, expect, it } from 'vitest'
import { parseRadarSelector } from '@/utils/radar/selector'
import { courseCases } from './tutorial-course-cases'

describe('courseCases', () => {
  // The debug page's mock host takes any target, so only this catches one the real host would refuse.
  it('reveal only Spotlight targets that are Radar selectors', () => {
    const targets = courseCases.flatMap((courseCase) => findSpotlightTargets(courseCase.source))

    expect(targets.length).toBeGreaterThan(0)
    for (const target of targets) expect(() => parseRadarSelector(target), target).not.toThrow()
  })
})

/**
 * The string literal targets, interpreted or raw, of `Spotlight.reveal` and `Spotlight.revealWith` calls in `source`.
 * A call separates its target by a space or a parenthesis, which tells it from inline code such as `` `Spotlight.reveal` ``.
 */
function findSpotlightTargets(source: string) {
  return [...source.matchAll(/Spotlight\.reveal(?:With)?(?:\s+|\s*\(\s*)("(?:[^"\\]|\\.)*"|`[^`]*`)/g)].map(
    ([, literal]) => (literal.startsWith('`') ? literal.slice(1, -1) : (JSON.parse(literal) as string))
  )
}
