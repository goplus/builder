import { afterEach, describe, expect, it, vi } from 'vitest'
import { isWindows } from '@/utils/ua'

vi.mock('@/utils/ua', () => ({ isWindows: vi.fn() }))

afterEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
})

describe('Native ruler cursor', () => {
  it.each([true, false])('uses the expected outline opacity on Windows=%s', async (windows) => {
    vi.mocked(isWindows).mockReturnValue(windows)
    const { rulerCursors } = await import('./ruler-cursor')
    for (const [key, cursor] of Object.entries(rulerCursors)) {
      const svg = decodeURIComponent(cursor.slice(cursor.indexOf(',') + 1, cursor.lastIndexOf('")')))
      const simple = key.startsWith('simple')
      expect(svg).toContain(`width="${simple ? 60 : 40}" height="${simple ? 60 : 40}"`)
      expect(cursor).toContain(simple ? '6 6, crosshair' : '4 4, crosshair')
      const path = new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('path')!
      const outlined = key.endsWith('Outlined')
      expect(path.getAttribute('stroke')).toBe(outlined ? 'white' : null)
      expect(path.getAttribute('stroke-opacity')).toBe(outlined && !windows ? '0.65' : null)
      if (outlined) expect(path.getAttribute('paint-order')).toBe('stroke')
    }
  })
})
