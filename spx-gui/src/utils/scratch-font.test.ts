import { describe, it, expect, vi, beforeEach } from 'vitest'
import { injectScratchFontsIntoSvg } from './scratch-font'

// Mock all font imports - in tests, font URLs resolve to mock paths
vi.mock('@/assets/fonts/scratch/NotoSans-Medium.ttf?url', () => ({ default: '/mock/NotoSans-Medium.ttf' }))
vi.mock('@/assets/fonts/scratch/SourceSerifPro-Regular.otf?url', () => ({
  default: '/mock/SourceSerifPro-Regular.otf'
}))
vi.mock('@/assets/fonts/scratch/handlee-regular.ttf?url', () => ({ default: '/mock/handlee-regular.ttf' }))
vi.mock('@/assets/fonts/scratch/Knewave.ttf?url', () => ({ default: '/mock/Knewave.ttf' }))
vi.mock('@/assets/fonts/scratch/Griffy-Regular.ttf?url', () => ({ default: '/mock/Griffy-Regular.ttf' }))
vi.mock('@/assets/fonts/scratch/Grand9K-Pixel.ttf?url', () => ({ default: '/mock/Grand9K-Pixel.ttf' }))
vi.mock('@/assets/fonts/scratch/Scratch.ttf?url', () => ({ default: '/mock/Scratch.ttf' }))

// Mock fetch to return predictable font data
const mockFetch = vi.fn()
global.fetch = mockFetch

function makeMockFontResponse() {
  const bytes = new Uint8Array([1, 2, 3, 4])
  return {
    arrayBuffer: () => Promise.resolve(bytes.buffer)
  }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue(makeMockFontResponse())
})

describe('injectScratchFontsIntoSvg', () => {
  it('returns SVG unchanged when no Scratch fonts are used', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text font-family="Arial">hello</text></svg>`
    const result = await injectScratchFontsIntoSvg(svg)
    expect(result).toBe(svg)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('injects @font-face for font-family attribute reference', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text font-family="Handwriting">a Snow Globe</text></svg>`
    const result = await injectScratchFontsIntoSvg(svg)
    expect(result).toContain('<style>')
    expect(result).toContain("font-family: 'Handwriting'")
    expect(result).toContain("format('truetype')")
    expect(mockFetch).toHaveBeenCalledWith('/mock/handlee-regular.ttf')
  })

  it('injects @font-face for font-family in style attribute', async () => {
    const svg = `<svg><text style="font-family: Marker; color: red">test</text></svg>`
    const result = await injectScratchFontsIntoSvg(svg)
    expect(result).toContain("font-family: 'Marker'")
    expect(mockFetch).toHaveBeenCalledWith('/mock/Knewave.ttf')
  })

  it('injects @font-face rules only for fonts actually used in the SVG', async () => {
    const svg = `<svg><text font-family="Pixel">test</text></svg>`
    const result = await injectScratchFontsIntoSvg(svg)
    expect(result).toContain("font-family: 'Pixel'")
    expect(result).not.toContain("font-family: 'Handwriting'")
    expect(result).not.toContain("font-family: 'Marker'")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('injects multiple @font-face rules when multiple Scratch fonts are used', async () => {
    const svg = `<svg><text font-family="Handwriting">a</text><text font-family="Curly">b</text></svg>`
    const result = await injectScratchFontsIntoSvg(svg)
    expect(result).toContain("font-family: 'Handwriting'")
    expect(result).toContain("font-family: 'Curly'")
  })

  it('inserts <style> block immediately after opening <svg> tag', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text font-family="Scratch">x</text></svg>`
    const result = await injectScratchFontsIntoSvg(svg)
    const svgTagEnd = result.indexOf('>')
    const styleStart = result.indexOf('<style>', svgTagEnd)
    expect(styleStart).toBeGreaterThan(svgTagEnd)
    // The <style> block should come before any other content
    const firstTextStart = result.indexOf('<text')
    expect(styleStart).toBeLessThan(firstTextStart)
  })

  it('uses opentype format for SourceSerifPro-Regular.otf', async () => {
    const svg = `<svg><text font-family="Serif">test</text></svg>`
    const result = await injectScratchFontsIntoSvg(svg)
    expect(result).toContain("format('opentype')")
    expect(mockFetch).toHaveBeenCalledWith('/mock/SourceSerifPro-Regular.otf')
  })

  it('caches font data across multiple calls for the same font', async () => {
    const svg = `<svg><text font-family="Pixel">test</text></svg>`
    await injectScratchFontsIntoSvg(svg)
    const callsBefore = mockFetch.mock.calls.length
    await injectScratchFontsIntoSvg(svg)
    // second call should not add new fetches (cache hit)
    expect(mockFetch.mock.calls.length).toBe(callsBefore)
  })
})
