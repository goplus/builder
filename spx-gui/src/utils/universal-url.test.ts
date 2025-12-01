import { describe, it, expect } from 'vitest'
import {
  UniversalUrlScheme,
  getUniversalUrlScheme,
  parseUniversalUrl,
  stringifyDataUrl,
  stringifyKodoUrl,
  type HttpUrlParsed,
  type DataUrlParsed,
  type KodoUrlParsed
} from './universal-url'

describe('getUniversalUrlScheme', () => {
  it('should parse http scheme', () => {
    expect(getUniversalUrlScheme('http://example.com')).toBe(UniversalUrlScheme.Http)
    expect(getUniversalUrlScheme('http://example.com/path')).toBe(UniversalUrlScheme.Http)
  })

  it('should parse https scheme', () => {
    expect(getUniversalUrlScheme('https://example.com')).toBe(UniversalUrlScheme.Https)
    expect(getUniversalUrlScheme('https://example.com/path/to/file.png')).toBe(UniversalUrlScheme.Https)
  })

  it('should parse data scheme', () => {
    expect(getUniversalUrlScheme('data:text/plain,hello')).toBe(UniversalUrlScheme.Data)
    expect(getUniversalUrlScheme('data:application/json,{"key":"value"}')).toBe(UniversalUrlScheme.Data)
  })

  it('should parse kodo scheme', () => {
    expect(getUniversalUrlScheme('kodo://bucket/key')).toBe(UniversalUrlScheme.Kodo)
    expect(getUniversalUrlScheme('kodo://my-bucket/path/to/file.png')).toBe(UniversalUrlScheme.Kodo)
  })

  it('should throw error for invalid url without colon', () => {
    expect(() => getUniversalUrlScheme('invalid-url')).toThrow('invalid universal url')
    expect(() => getUniversalUrlScheme('noscheme')).toThrow('invalid universal url')
  })

  it('should throw error for unsupported scheme', () => {
    expect(() => getUniversalUrlScheme('ftp://example.com')).toThrow('unsupported universal url scheme: ftp')
    expect(() => getUniversalUrlScheme('file:///path/to/file')).toThrow('unsupported universal url scheme: file')
    expect(() => getUniversalUrlScheme('custom://something')).toThrow('unsupported universal url scheme: custom')
  })
})

describe('parseUniversalUrl', () => {
  describe('http/https urls', () => {
    it('should parse http url', () => {
      const result = parseUniversalUrl('http://example.com/path') as HttpUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Http)
      expect(result.url).toBe('http://example.com/path')
    })

    it('should parse https url', () => {
      const result = parseUniversalUrl('https://example.com/image.png') as HttpUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Https)
      expect(result.url).toBe('https://example.com/image.png')
    })

    it('should parse urls with query parameters', () => {
      const url = 'https://example.com/api?key=value&foo=bar'
      const result = parseUniversalUrl(url) as HttpUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Https)
      expect(result.url).toBe(url)
    })

    it('should parse urls with hash', () => {
      const url = 'https://example.com/page#section'
      const result = parseUniversalUrl(url) as HttpUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Https)
      expect(result.url).toBe(url)
    })
  })

  describe('data urls', () => {
    it('should parse simple data url', () => {
      const url = 'data:text/plain,hello'
      const result = parseUniversalUrl(url) as DataUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Data)
      expect(result.url).toBe(url)
    })

    it('should parse data url with encoded content', () => {
      const url = 'data:text/plain,hello%20world'
      const result = parseUniversalUrl(url) as DataUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Data)
      expect(result.url).toBe(url)
    })

    it('should parse json data url', () => {
      const url = 'data:application/json,{"key":"value"}'
      const result = parseUniversalUrl(url) as DataUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Data)
      expect(result.url).toBe(url)
    })
  })

  describe('kodo urls', () => {
    it('should parse kodo url', () => {
      const result = parseUniversalUrl('kodo://my-bucket/my-key') as KodoUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Kodo)
      expect(result.bucket).toBe('my-bucket')
      expect(result.key).toBe('my-key')
    })

    it('should parse kodo url with path', () => {
      const result = parseUniversalUrl('kodo://bucket/path/to/file.png') as KodoUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Kodo)
      expect(result.bucket).toBe('bucket')
      expect(result.key).toBe('path/to/file.png')
    })

    it('should parse kodo url with complex key', () => {
      const result = parseUniversalUrl('kodo://test-bucket/deep/nested/path/file-name.jpg') as KodoUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Kodo)
      expect(result.bucket).toBe('test-bucket')
      expect(result.key).toBe('deep/nested/path/file-name.jpg')
    })

    it('should throw error for invalid kodo url without slash', () => {
      expect(() => parseUniversalUrl('kodo://bucket-only')).toThrow('invalid kodo universal url')
    })

    it('should handle kodo url with empty key', () => {
      const result = parseUniversalUrl('kodo://bucket/') as KodoUrlParsed
      expect(result.scheme).toBe(UniversalUrlScheme.Kodo)
      expect(result.bucket).toBe('bucket')
      expect(result.key).toBe('')
    })
  })

  it('should throw error for invalid url', () => {
    expect(() => parseUniversalUrl('invalid-url')).toThrow('invalid universal url')
  })

  it('should throw error for unsupported scheme', () => {
    expect(() => parseUniversalUrl('ftp://example.com')).toThrow('unsupported universal url scheme: ftp')
  })
})

describe('stringifyDataUrl', () => {
  it('should stringify data url with text/plain mime type', () => {
    const result = stringifyDataUrl('text/plain', 'hello world')
    expect(result).toBe('data:;,hello%20world')
  })

  it('should stringify data url with custom mime type', () => {
    const result = stringifyDataUrl('application/json', '{"key":"value"}')
    expect(result).toBe('data:application/json,%7B%22key%22%3A%22value%22%7D')
  })

  it('should encode special characters', () => {
    const result = stringifyDataUrl('text/plain', 'hello & goodbye')
    expect(result).toBe('data:;,hello%20%26%20goodbye')
  })

  it('should handle empty data', () => {
    const result = stringifyDataUrl('text/plain', '')
    expect(result).toBe('data:;,')
  })

  it('should handle unicode characters', () => {
    const result = stringifyDataUrl('text/plain', '你好世界')
    expect(result).toBe('data:;,%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C')
  })

  it('should use semicolon shorthand for text/plain', () => {
    const result = stringifyDataUrl('text/plain', 'test')
    expect(result).toMatch(/^data:;,/)
  })

  it('should not use shorthand for other mime types', () => {
    const result = stringifyDataUrl('application/xml', '<xml/>')
    expect(result).toMatch(/^data:application\/xml,/)
  })
})

describe('stringifyKodoUrl', () => {
  it('should stringify kodo url', () => {
    const result = stringifyKodoUrl('my-bucket', 'my-key')
    expect(result).toBe('kodo://my-bucket/my-key')
  })

  it('should stringify kodo url with path', () => {
    const result = stringifyKodoUrl('bucket', 'path/to/file.png')
    expect(result).toBe('kodo://bucket/path/to/file.png')
  })

  it('should stringify kodo url with complex path', () => {
    const result = stringifyKodoUrl('test-bucket', 'deep/nested/path/file-name.jpg')
    expect(result).toBe('kodo://test-bucket/deep/nested/path/file-name.jpg')
  })

  it('should handle empty key', () => {
    const result = stringifyKodoUrl('bucket', '')
    expect(result).toBe('kodo://bucket/')
  })

  it('should handle special characters in bucket and key', () => {
    const result = stringifyKodoUrl('my-bucket-123', 'path/with-dashes/file_name.png')
    expect(result).toBe('kodo://my-bucket-123/path/with-dashes/file_name.png')
  })
})

describe('round-trip consistency', () => {
  it('should maintain consistency for http urls', () => {
    const url = 'http://example.com/path/to/resource'
    const parsed = parseUniversalUrl(url) as HttpUrlParsed
    expect(parsed.url).toBe(url)
  })

  it('should maintain consistency for https urls', () => {
    const url = 'https://example.com/path/to/resource.png'
    const parsed = parseUniversalUrl(url) as HttpUrlParsed
    expect(parsed.url).toBe(url)
  })

  it('should maintain consistency for kodo urls', () => {
    const bucket = 'test-bucket'
    const key = 'path/to/file.png'
    const url = stringifyKodoUrl(bucket, key)
    const parsed = parseUniversalUrl(url) as KodoUrlParsed
    expect(parsed.bucket).toBe(bucket)
    expect(parsed.key).toBe(key)
    expect(stringifyKodoUrl(parsed.bucket, parsed.key)).toBe(url)
  })

  it('should maintain consistency for data urls', () => {
    const mimeType = 'application/json'
    const data = '{"test":"value"}'
    const url = stringifyDataUrl(mimeType, data)
    const parsed = parseUniversalUrl(url) as DataUrlParsed
    expect(parsed.url).toBe(url)
  })
})
