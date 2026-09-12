import { describe, expect, it } from 'vitest'
import { applyFontPreferencesToSvgText } from './svg-font'

function makeSvg(text: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg">${text}</svg>`
}

describe('applyFontPreferencesToSvgText', () => {
  it('leaves SVG unchanged when no project preference is configured', () => {
    const svg = makeSvg('<text>hello</text>')
    expect(applyFontPreferencesToSvgText(svg, [])).toBe(svg)
  })

  it('uses project preferences when the SVG root has no font family', () => {
    expect(applyFontPreferencesToSvgText(makeSvg('<text>你好</text>'), ['basic-chinese', 'default'])).toContain(
      'svg { font-family: "basic-chinese", "default"; }'
    )
  })

  it('keeps an SVG root font preference over the project preference', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" font-family="custom"><text>hello</text></svg>'
    expect(applyFontPreferencesToSvgText(svg, ['default'])).toBe(svg)
  })
})
