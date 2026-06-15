/**
 * Scratch built-in font support for SVG asset rendering.
 *
 * Scratch projects use a fixed set of named fonts (e.g. "Handwriting", "Marker") that map to
 * specific font files vendored from scratch-render-fonts. SVG assets from converted Scratch
 * projects (via sb2xbp) carry these font-family names in their <text> elements. To render
 * them correctly in edit mode, we inject @font-face rules with inline data URIs into the SVG
 * text before creating the blob URL used as a background-image.
 *
 * Browser security prevents SVG blobs from loading external resources (including fonts defined
 * at page level via @font-face), so the font data must be embedded directly in the SVG.
 *
 * Font files are vendored from:
 * https://github.com/goplus/spx/tree/dev/cmd/spx/template/project/engine/fonts/scratch
 */

import notoSansUrl from '@/assets/fonts/scratch/NotoSans-Medium.ttf?url'
import sourceSerifUrl from '@/assets/fonts/scratch/SourceSerifPro-Regular.otf?url'
import handleeUrl from '@/assets/fonts/scratch/handlee-regular.ttf?url'
import knewaveUrl from '@/assets/fonts/scratch/Knewave.ttf?url'
import griffyUrl from '@/assets/fonts/scratch/Griffy-Regular.ttf?url'
import grandPixelUrl from '@/assets/fonts/scratch/Grand9K-Pixel.ttf?url'
import scratchUrl from '@/assets/fonts/scratch/Scratch.ttf?url'

type FontDef = {
  url: string
  format: string
}

const scratchFontDefs: Record<string, FontDef> = {
  'Sans Serif': { url: notoSansUrl, format: 'truetype' },
  Serif: { url: sourceSerifUrl, format: 'opentype' },
  Handwriting: { url: handleeUrl, format: 'truetype' },
  Marker: { url: knewaveUrl, format: 'truetype' },
  Curly: { url: griffyUrl, format: 'truetype' },
  Pixel: { url: grandPixelUrl, format: 'truetype' },
  Scratch: { url: scratchUrl, format: 'truetype' }
}

const fontBase64Cache = new Map<string, string>()

async function fetchFontAsDataUri(def: FontDef): Promise<string> {
  const cached = fontBase64Cache.get(def.url)
  if (cached != null) return cached

  const response = await fetch(def.url)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  const mimeType = def.format === 'opentype' ? 'font/otf' : 'font/ttf'
  const dataUri = `data:${mimeType};base64,${base64}`
  fontBase64Cache.set(def.url, dataUri)
  return dataUri
}

function getUsedScratchFamilies(svgText: string): string[] {
  const used: string[] = []
  for (const family of Object.keys(scratchFontDefs)) {
    // Match font-family in both attribute and style attribute forms.
    // Attribute: font-family="Handwriting"
    // Style:     style="... font-family: Handwriting ..."
    const escapedFamily = family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const attrPattern = new RegExp(`font-family=["']${escapedFamily}["']`, 'i')
    const stylePattern = new RegExp(`font-family\\s*:\\s*${escapedFamily}\\b`, 'i')
    if (attrPattern.test(svgText) || stylePattern.test(svgText)) {
      used.push(family)
    }
  }
  return used
}

/**
 * Inject @font-face rules for any Scratch built-in fonts used in the given SVG text.
 * Font data is embedded as inline data URIs so the SVG renders correctly when loaded
 * as a blob (which cannot reference external resources).
 * If no Scratch fonts are referenced, the original SVG text is returned unchanged.
 */
export async function injectScratchFontsIntoSvg(svgText: string): Promise<string> {
  const usedFamilies = getUsedScratchFamilies(svgText)
  if (usedFamilies.length === 0) return svgText

  const fontFaceRules = await Promise.all(
    usedFamilies.map(async (family) => {
      const def = scratchFontDefs[family]!
      const dataUri = await fetchFontAsDataUri(def)
      return `@font-face { font-family: '${family}'; src: url('${dataUri}') format('${def.format}'); }`
    })
  )

  const styleBlock = `<style>\n${fontFaceRules.join('\n')}\n</style>`

  // Insert the <style> block immediately after the opening <svg ...> tag.
  return svgText.replace(/(<svg[^>]*>)/, `$1\n${styleBlock}`)
}
