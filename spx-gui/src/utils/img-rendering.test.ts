import { createApp, defineComponent, h, shallowRef, type App, type Ref, type WatchSource } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fromText, type File } from '@/models/common/file'
import { getFontAwareImageUrl, provideSvgFontContext, useFontAwareImageUrl, type SvgFontConfig } from './img-rendering'
import { createSvgRenderer } from './resvg'
import { applyFontPreferencesToSvgText } from './svg-font'

const render = vi.fn(() => new Uint8Array([1, 2, 3]))

vi.mock('./resvg', () => ({
  createSvgRenderer: vi.fn(async () => ({ render }))
}))

vi.mock('./svg-font', () => ({
  applyFontPreferencesToSvgText: vi.fn((svgText: string) => svgText)
}))

describe('font-aware image rendering', () => {
  const apps: App[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    let objectUrlId = 0
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:mock-${objectUrlId++}`)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => apps.splice(0).forEach((app) => app.unmount()))

  function mountImageConsumers(fontConfig: WatchSource<SvgFontConfig>, file: File, count = 1) {
    const urls: Ref<string | null>[] = []
    const ImageConsumer = defineComponent({
      setup() {
        const [url] = useFontAwareImageUrl(() => file)
        urls.push(url)
        return () => null
      }
    })
    const app = createApp(
      defineComponent({
        setup() {
          provideSvgFontContext(fontConfig)
          return () => h('div', Array.from({ length: count }, () => h(ImageConsumer)))
        }
      })
    )
    app.mount(document.createElement('div'))
    apps.push(app)
    return { app, urls }
  }

  it('reuses a rendered image for the same source File', async () => {
    const file = fromText('costume.svg', '<svg><text font-family="custom">hello</text></svg>', {
      type: 'image/svg+xml'
    })
    const config = shallowRef<SvgFontConfig>({ fontPreferences: [], fonts: new Map() })
    const { urls } = mountImageConsumers(() => config.value, file, 2)

    await vi.waitFor(() => expect(urls.map((url) => url.value)).toEqual(['blob:mock-0', 'blob:mock-1']))

    expect(createSvgRenderer).toHaveBeenCalledTimes(1)
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('uses the original URL when no font context is provided', async () => {
    const file = fromText('costume.svg', '<svg><text>hello</text></svg>', { type: 'image/svg+xml' })

    await expect(getFontAwareImageUrl(file, null, new AbortController().signal)).resolves.toBe('blob:mock-0')
    expect(createSvgRenderer).not.toHaveBeenCalled()
  })

  it('passes project font preferences to SVG rendering', async () => {
    const file = fromText('costume.svg', '<svg><text>你好</text></svg>', { type: 'image/svg+xml' })
    const config = shallowRef<SvgFontConfig>({
      fontPreferences: ['basic-chinese', 'default'],
      fonts: new Map()
    })
    const { urls } = mountImageConsumers(() => config.value, file)

    await vi.waitFor(() => expect(urls[0].value).toBe('blob:mock-0'))

    expect(applyFontPreferencesToSvgText).toHaveBeenCalledWith(
      '<svg><text>你好</text></svg>',
      ['basic-chinese', 'default']
    )
  })

  it('rerenders the current File when its immutable font config changes', async () => {
    const file = fromText('costume.svg', '<svg><text>你好</text></svg>', { type: 'image/svg+xml' })
    const config = shallowRef<SvgFontConfig>({ fontPreferences: ['default'], fonts: new Map() })
    const { urls } = mountImageConsumers(() => config.value, file)

    await vi.waitFor(() => expect(urls[0].value).toBe('blob:mock-0'))
    config.value = { fontPreferences: ['basic-chinese', 'default'], fonts: new Map() }
    await vi.waitFor(() => expect(urls[0].value).toBe('blob:mock-1'))

    expect(createSvgRenderer).toHaveBeenCalledTimes(2)
    expect(render).toHaveBeenCalledTimes(2)
  })

  it('keeps the current URL when an immutable font config has the same content', async () => {
    const file = fromText('costume.svg', '<svg><text>你好</text></svg>', { type: 'image/svg+xml' })
    const fontFile = fromText('font.otf', 'font')
    const config = shallowRef<SvgFontConfig>({
      fontPreferences: ['custom', 'default'],
      fonts: new Map([['custom', fontFile]])
    })
    const { urls } = mountImageConsumers(() => config.value, file)

    await vi.waitFor(() => expect(urls[0].value).toBe('blob:mock-0'))
    config.value = {
      fontPreferences: ['custom', 'default'],
      fonts: new Map([['custom', fontFile]])
    }
    await new Promise((resolve) => setTimeout(resolve))

    expect(urls[0].value).toBe('blob:mock-0')
    expect(createSvgRenderer).toHaveBeenCalledTimes(1)
  })

  it('revokes rendered-image URLs when the consumer is unmounted', async () => {
    const file = fromText('costume.svg', '<svg><text>hello</text></svg>', { type: 'image/svg+xml' })
    const config = shallowRef<SvgFontConfig>({ fontPreferences: [], fonts: new Map() })
    const { app, urls } = mountImageConsumers(() => config.value, file)

    await vi.waitFor(() => expect(urls[0].value).toBe('blob:mock-0'))
    app.unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-0')
  })
})
