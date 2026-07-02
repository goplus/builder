import { parseSVGText } from './img'

const scratchFontDefs = {
  'Sans Serif': {
    url: new URL('../assets/fonts/scratch/NotoSans-Medium.ttf', import.meta.url).href,
    format: 'truetype',
    mime: 'font/ttf'
  },
  Serif: {
    url: new URL('../assets/fonts/scratch/SourceSerifPro-Regular.otf', import.meta.url).href,
    format: 'opentype',
    mime: 'font/otf'
  },
  Handwriting: {
    url: new URL('../assets/fonts/scratch/handlee-regular.ttf', import.meta.url).href,
    format: 'truetype',
    mime: 'font/ttf'
  },
  Marker: {
    url: new URL('../assets/fonts/scratch/Knewave.ttf', import.meta.url).href,
    format: 'truetype',
    mime: 'font/ttf'
  },
  Curly: {
    url: new URL('../assets/fonts/scratch/Griffy-Regular.ttf', import.meta.url).href,
    format: 'truetype',
    mime: 'font/ttf'
  },
  Pixel: {
    url: new URL('../assets/fonts/scratch/Grand9K-Pixel.ttf', import.meta.url).href,
    format: 'truetype',
    mime: 'font/ttf'
  },
  Scratch: {
    url: new URL('../assets/fonts/scratch/Scratch.ttf', import.meta.url).href,
    format: 'truetype',
    mime: 'font/ttf'
  }
} as const

type ScratchFontFamily = keyof typeof scratchFontDefs

const scratchFontFamilies = Object.keys(scratchFontDefs) as ScratchFontFamily[]
const fontDataUriCache = new Map<ScratchFontFamily, Promise<string>>()

function stripQuotes(value: string) {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function getFontFamilyValues(value: string) {
  return value.split(',').map(stripQuotes)
}

function getUsedScratchFontFamilies(svg: SVGSVGElement) {
  const used = new Set<ScratchFontFamily>()
  // Scratch-authored SVGs put font families on text descendants; keep detection scoped to that compatibility target.
  for (const el of Array.from(svg.querySelectorAll('[font-family]'))) {
    const attrValue = el.getAttribute('font-family')
    if (attrValue == null) continue
    const values = getFontFamilyValues(attrValue)
    for (const family of scratchFontFamilies) {
      if (values.includes(family)) used.add(family)
    }
  }
  return Array.from(used)
}

function fetchFontDataUri(family: ScratchFontFamily) {
  const cached = fontDataUriCache.get(family)
  if (cached != null) return cached

  const def = scratchFontDefs[family]
  const promise = fetch(def.url)
    .then(async (resp) => {
      if (!resp.ok) throw new Error(`Failed to fetch Scratch font ${family}: ${resp.status}`)
      const bytes = new Uint8Array(await resp.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
      }
      return `data:${def.mime};base64,${btoa(binary)}`
    })
    .catch((e) => {
      fontDataUriCache.delete(family)
      throw e
    })
  fontDataUriCache.set(family, promise)
  return promise
}

function makeFontFaceRule(family: ScratchFontFamily, dataUri: string) {
  const def = scratchFontDefs[family]
  return `@font-face { font-family: ${JSON.stringify(family)}; src: url(${JSON.stringify(dataUri)}) format(${JSON.stringify(def.format)}); }`
}

/** Returns SVG text with Scratch font faces embedded, or null when the SVG does not need them. */
export async function injectScratchFontsToSvgText(svgText: string) {
  const svg = parseSVGText(svgText)
  const usedFamilies = getUsedScratchFontFamilies(svg)
  if (usedFamilies.length === 0) return null

  const rules = await Promise.all(
    usedFamilies.map(async (family) => makeFontFaceRule(family, await fetchFontDataUri(family)))
  )
  const doc = svg.ownerDocument
  const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = rules.join('\n')
  svg.insertBefore(style, svg.firstChild)
  return new XMLSerializer().serializeToString(svg)
}
