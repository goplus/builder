import { describe, expect, it } from 'vitest'

import { fromText, toConfig, type Files } from '../common/file'
import { FontFamily } from './font'

describe('FontFamily', () => {
  it('rejects empty family names', () => {
    expect(() => new FontFamily('', fromText('font.otf', 'font'))).toThrow('font family name must not be empty')
  })

  it('loads and exports a project font', async () => {
    const files: Files = {
      'assets/fonts/basic-chinese/index.json': fromText('index.json', '{"faces":[{"path":"font.otf"}]}'),
      'assets/fonts/basic-chinese/font.otf': fromText('font.otf', 'font')
    }

    const [fontFamily] = await FontFamily.loadAll(files)
    expect(fontFamily.name).toBe('basic-chinese')
    expect(fontFamily.file.name).toBe('font.otf')
    expect(await toConfig(fontFamily.export()['assets/fonts/basic-chinese/index.json']!)).toEqual({
      faces: [{ path: 'font.otf' }]
    })
  })

  it('rejects the reserved default family', async () => {
    const files: Files = {
      'assets/fonts/default/index.json': fromText('index.json', '{"faces":[{"path":"font.otf"}]}'),
      'assets/fonts/default/font.otf': fromText('font.otf', 'font')
    }

    await expect(FontFamily.loadAll(files)).rejects.toThrow('font family default is reserved')
  })
})
