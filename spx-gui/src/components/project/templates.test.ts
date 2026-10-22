import { describe, expect, it } from 'vitest'
import { getProjectTemplate, projectTemplates } from './templates'

describe('project templates', () => {
  it('provides the supported landscape and portrait viewport sizes', () => {
    expect(projectTemplates.map(({ id, viewportSize }) => ({ id, viewportSize }))).toEqual([
      { id: 'classic', viewportSize: { width: 480, height: 360 } },
      { id: 'landscape', viewportSize: { width: 545, height: 307 } },
      { id: 'portrait', viewportSize: { width: 307, height: 545 } }
    ])
    expect(getProjectTemplate('portrait').viewportSize).toEqual({ width: 307, height: 545 })
  })
})
