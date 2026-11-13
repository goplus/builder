import type { File } from '@/models/common/file'
import { parseSVGText } from './img'

function makeFontPreferencesRule(svg: SVGSVGElement, fontPreferences: string[]) {
  if (svg.hasAttribute('font-family') || fontPreferences.length === 0) return null
  return `svg { font-family: ${fontPreferences.map((font) => JSON.stringify(font)).join(', ')}; }`
}

function stripQuotes(value: string) {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function getUsedFontFamilies(svg: SVGSVGElement) {
  const used = new Set<string>()
  for (const el of [svg, ...Array.from(svg.querySelectorAll('[font-family]'))]) {
    const attrValue = el.getAttribute('font-family')
    if (attrValue == null) continue
    attrValue
      .split(',')
      .map(stripQuotes)
      .filter((family) => family !== '')
      .forEach((family) => used.add(family))
  }
  return Array.from(used)
}

function arrayBufferToDataUri(file: File, arrayBuffer: ArrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return `data:${file.type || 'font/opentype'};base64,${btoa(binary)}`
}

function makeFontFaceRule(family: string, dataUri: string) {
  return `@font-face { font-family: ${JSON.stringify(family)}; src: url(${JSON.stringify(dataUri)}); }`
}

/** Applies project font preferences and embeds the referenced font files into an SVG. */
export async function injectFontsToSvgText(svgText: string, fontPreferences: string[], fontFiles: Map<string, File>) {
  const svg = parseSVGText(svgText)
  const fontPreferencesRule = makeFontPreferencesRule(svg, fontPreferences)
  const usedFontFamilies = new Set(getUsedFontFamilies(svg))
  if (fontPreferencesRule != null) fontPreferences.forEach((family) => usedFontFamilies.add(family))
  const rules = await Promise.all(
    Array.from(usedFontFamilies).map(async (family) => {
      const file = fontFiles.get(family)
      if (file == null) return null
      return makeFontFaceRule(family, arrayBufferToDataUri(file, await file.arrayBuffer()))
    })
  )
  const fontFaceRules = rules.filter((rule) => rule != null)
  if (fontFaceRules.length === 0 && fontPreferencesRule == null) return null

  const style = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = [fontPreferencesRule, ...fontFaceRules].filter((rule) => rule != null).join('\n')
  svg.insertBefore(style, svg.firstChild)
  return new XMLSerializer().serializeToString(svg)
}
