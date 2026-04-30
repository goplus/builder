import { describe, expect, it } from 'vitest'

import { getSpxProjectKnowledge } from './index'

describe('getSpxProjectKnowledge', () => {
  it('builds SPX project knowledge from fixed documents', () => {
    const knowledge = getSpxProjectKnowledge()

    expect(knowledge).toContain('# About spx')
    expect(knowledge).toContain('# spx APIs')
  })
})
