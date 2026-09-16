import { describe, expect, it } from 'vitest'
import { getProjectTemplate, projectTemplates } from './templates'

describe('project templates', () => {
  it('provides the supported landscape and portrait viewport sizes', () => {
    expect(projectTemplates.map(({ id, viewportSize }) => ({ id, viewportSize }))).toEqual([
      { id: 'classic', viewportSize: { width: 480, height: 360 } },
      { id: 'landscape', viewportSize: { width: 720, height: 405 } },
      { id: 'portrait', viewportSize: { width: 620, height: 900 } }
    ])
    expect(getProjectTemplate('portrait').viewportSize).toEqual({ width: 620, height: 900 })
  })
})
