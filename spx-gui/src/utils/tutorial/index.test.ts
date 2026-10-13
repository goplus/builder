import { describe, expect, it } from 'vitest'
import { parseRadarSelector } from '@/utils/radar/selector'
import { getTutorialCourseSkillFiles } from '.'

describe('getTutorialCourseSkillFiles', () => {
  // Course authors and their Copilot copy these examples, so a stale one ends up failing real courses.
  it('shows only Spotlight targets that are Radar selectors', () => {
    const targets = Object.values(getTutorialCourseSkillFiles()).flatMap(findSpotlightTargets)

    expect(targets.length).toBeGreaterThan(0)
    for (const target of targets) expect(() => parseRadarSelector(target), target).not.toThrow()
  })
})

/** The string literal targets of `Spotlight.reveal` and `Spotlight.revealWith` calls in `source`. */
function findSpotlightTargets(source: string) {
  return [...source.matchAll(/Spotlight\.reveal(?:With)?\s*\(?\s*("(?:[^"\\]|\\.)*")/g)].map(
    ([, literal]) => JSON.parse(literal) as string
  )
}
