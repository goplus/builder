import { describe, expect, it } from 'vitest'
import { fromText } from '@/models/common/file'
import { injectFontsToSvgText } from './svg-font'

function makeSvg(text: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg">${text}</svg>`
}

describe('injectFontsToSvgText', () => {
  it('returns null when no provided font is used', async () => {
    await expect(injectFontsToSvgText(makeSvg('<text font-family="Arial">hello</text>'), [], new Map())).resolves.toBe(
      null
    )
  })

  it('uses project preferences for text without an explicit font family', async () => {
    const result = await injectFontsToSvgText(
      makeSvg('<text>你好</text>'),
      ['basic-chinese', 'default'],
      new Map([
        ['basic-chinese', fromText('basic-chinese.otf', 'chinese', { type: 'font/otf' })],
        ['default', fromText('default.ttf', 'latin', { type: 'font/ttf' })]
      ])
    )

    expect(result).toContain('svg { font-family: "basic-chinese", "default"; }')
    expect(result).toContain('font-family: "basic-chinese"')
    expect(result).toContain('font-family: "default"')
  })

  it('keeps an SVG root font preference over the project preference', async () => {
    const result = await injectFontsToSvgText(
      '<svg xmlns="http://www.w3.org/2000/svg" font-family="custom"><text>hello</text></svg>',
      ['default'],
      new Map([['custom', fromText('custom.otf', 'font', { type: 'font/otf' })]])
    )

    expect(result).toContain('font-family="custom"')
    expect(result).not.toContain('svg { font-family: "default"; }')
  })

  it('embeds only referenced font files', async () => {
    const result = await injectFontsToSvgText(
      makeSvg('<text font-family="custom">hello</text>'),
      [],
      new Map([
        ['custom', fromText('custom.otf', 'font', { type: 'font/otf' })],
        ['unused', fromText('unused.otf', 'unused', { type: 'font/otf' })]
      ])
    )

    expect(result).toContain('font-family: "custom"')
    expect(result).toContain('data:font/otf;base64,Zm9udA==')
    expect(result).not.toContain('font-family: "unused"')
  })

  it('embeds quoted SVG font-family values', async () => {
    const result = await injectFontsToSvgText(
      makeSvg('<text font-family="\'custom\'">hello</text>'),
      [],
      new Map([['custom', fromText('custom.otf', 'font', { type: 'font/otf' })]])
    )

    expect(result).toContain('font-family: "custom"')
  })

  it('ignores empty SVG font-family values', async () => {
    await expect(
      injectFontsToSvgText(
        makeSvg('<text font-family=" , ">hello</text>'),
        [],
        new Map([['', fromText('empty.otf', 'font', { type: 'font/otf' })]])
      )
    ).resolves.toBe(null)
  })
})
