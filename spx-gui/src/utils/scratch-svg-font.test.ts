import { beforeEach, describe, expect, it, vi } from 'vitest'

function makeSvg(text: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg">${text}</svg>`
}

function makeFontResponse() {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer
  } as Response
}

async function loadModule() {
  vi.resetModules()
  return await import('./scratch-svg-font')
}

describe('injectScratchFontsToSvgText', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeFontResponse())
    )
  })

  it('returns null when no Scratch fonts are used', async () => {
    const { injectScratchFontsToSvgText } = await loadModule()
    await expect(injectScratchFontsToSvgText(makeSvg('<text font-family="Arial">hello</text>'))).resolves.toBe(null)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('injects font faces for font-family attributes', async () => {
    const { injectScratchFontsToSvgText } = await loadModule()
    const result = await injectScratchFontsToSvgText(makeSvg('<text font-family="Handwriting">hello</text>'))
    expect(result).toContain('<style>')
    expect(result).toContain('font-family: "Handwriting"')
    expect(result).toContain('data:font/ttf;base64,AQIDBA==')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('injects only Scratch fonts referenced by the SVG', async () => {
    const { injectScratchFontsToSvgText } = await loadModule()
    const result = await injectScratchFontsToSvgText(
      makeSvg('<text font-family="Pixel, Arial">hello</text><text font-family="Serif">world</text>')
    )
    expect(result).toContain('font-family: "Pixel"')
    expect(result).toContain('font-family: "Serif"')
    expect(result).not.toContain('font-family: "Marker"')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('caches font data across calls', async () => {
    const { injectScratchFontsToSvgText } = await loadModule()
    await injectScratchFontsToSvgText(makeSvg('<text font-family="Scratch">hello</text>'))
    await injectScratchFontsToSvgText(makeSvg('<text font-family="Scratch">world</text>'))
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shares concurrent font fetches for the same font', async () => {
    let resolveFontResponse!: (resp: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFontResponse = resolve
          })
      )
    )
    const { injectScratchFontsToSvgText } = await loadModule()
    const first = injectScratchFontsToSvgText(makeSvg('<text font-family="Scratch">hello</text>'))
    const second = injectScratchFontsToSvgText(makeSvg('<text font-family="Scratch">world</text>'))
    expect(fetch).toHaveBeenCalledTimes(1)

    resolveFontResponse(makeFontResponse())
    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
  })

  it('retries font fetches after failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
        .mockResolvedValueOnce(makeFontResponse())
    )
    const { injectScratchFontsToSvgText } = await loadModule()
    await expect(injectScratchFontsToSvgText(makeSvg('<text font-family="Marker">hello</text>'))).rejects.toThrow(
      'Failed to fetch Scratch font Marker: 503'
    )
    await expect(injectScratchFontsToSvgText(makeSvg('<text font-family="Marker">world</text>'))).resolves.toContain(
      'font-family: "Marker"'
    )
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws when a font cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404 }) as Response)
    )
    const { injectScratchFontsToSvgText } = await loadModule()
    await expect(injectScratchFontsToSvgText(makeSvg('<text font-family="Marker">hello</text>'))).rejects.toThrow(
      'Failed to fetch Scratch font Marker: 404'
    )
  })
})
