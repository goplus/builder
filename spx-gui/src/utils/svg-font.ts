import { parseSVGText } from './img'

function makeFontPreferencesRule(svg: SVGSVGElement, fontPreferences: string[]) {
  if (svg.hasAttribute('font-family') || fontPreferences.length === 0) return null
  return `svg { font-family: ${fontPreferences.map((font) => JSON.stringify(font)).join(', ')}; }`
}

/** Applies project font preferences to SVG text. */
export function applyFontPreferencesToSvgText(svgText: string, fontPreferences: string[]) {
  const svg = parseSVGText(svgText)
  const fontPreferencesRule = makeFontPreferencesRule(svg, fontPreferences)
  if (fontPreferencesRule == null) return svgText

  const style = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = fontPreferencesRule
  svg.insertBefore(style, svg.firstChild)
  return new XMLSerializer().serializeToString(svg)
}
