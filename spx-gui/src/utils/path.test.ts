import { describe, it, expect } from 'vitest'
import { encodeFilename, encodePathSegment, resolve, filename, stripExt, extname, validatePathSegment } from './path'

describe('resolve', () => {
  it('should work well with path', () => {
    expect(resolve('foo', 'bar')).toBe('foo/bar')
    expect(resolve('foo', 'bar', 'baz')).toBe('foo/bar/baz')
    expect(resolve('/foo/bar', 'baz')).toBe('/foo/bar/baz')
    expect(resolve('/foo/bar', 'baz', 'qux')).toBe('/foo/bar/baz/qux')
  })
  it('should work well with no path', () => {
    expect(resolve('foo')).toBe('foo')
  })
  it('should work well with complex path', () => {
    expect(resolve('foo', 'bar/baz')).toBe('foo/bar/baz')
    expect(resolve('foo', 'bar/baz', 'qux')).toBe('foo/bar/baz/qux')
    expect(resolve('foo/bar', 'baz/qux')).toBe('foo/bar/baz/qux')
    expect(resolve('foo/bar', 'baz/qux', 'quux')).toBe('foo/bar/baz/qux/quux')
    expect(resolve('foo', 'bar/../baz')).toBe('foo/baz')
    expect(resolve('foo', 'bar/../baz', 'qux')).toBe('foo/baz/qux')
    expect(resolve('foo', '.')).toBe('foo')
    expect(resolve('foo', './bar')).toBe('foo/bar')
    expect(resolve('foo/bar/baz', '../../qux')).toBe('foo/qux')
  })
})

describe('filename', () => {
  it('should work well with path', () => {
    expect(filename('abc.txt')).toBe('abc.txt')
    expect(filename('abc///def.txt')).toBe('def.txt')
    expect(filename('你好/世界.png')).toBe('世界.png')
    expect(filename('src/你好/世界.png')).toBe('世界.png')
  })
  it('should work well with no ext', () => {
    expect(filename('abc')).toBe('abc')
    expect(filename('/foo/.git/a')).toBe('a')
  })
  it('should work well with complex ext', () => {
    expect(filename('foo/abc.d.ts')).toBe('abc.d.ts')
    expect(filename('foo/.cache/abc.d.ts')).toBe('abc.d.ts')
    expect(filename('/foo/bar/.gitignore')).toBe('.gitignore')
  })
  it('should work well with special characters', () => {
    expect(filename('foo/Artificial Axolotl 😡.svg')).toBe('Artificial Axolotl 😡.svg')
  })
  it('keeps question marks in POSIX paths', () => {
    expect(filename('foo/image?draft.png')).toBe('image?draft.png')
  })
})

describe('stripExt', () => {
  it('should work well with path', () => {
    expect(stripExt('abc.txt')).toBe('abc')
    expect(stripExt('中文.png')).toBe('中文')
    expect(stripExt('src/你好/世界.png')).toBe('src/你好/世界')
  })
  it('should work well with no ext', () => {
    expect(stripExt('abc')).toBe('abc')
    expect(stripExt('/foo/.git/a')).toBe('/foo/.git/a')
  })
  it('should work well with complex ext', () => {
    expect(stripExt('abc.d.ts')).toBe('abc.d')
    expect(stripExt('foo/.cache/abc.d.ts')).toBe('foo/.cache/abc.d')
    expect(stripExt('/foo/bar/.gitignore')).toBe('/foo/bar/.gitignore')
  })
  it('should work well with special characters', () => {
    expect(stripExt('foo/Artificial Axolotl 😡.svg')).toBe('foo/Artificial Axolotl 😡')
  })
  it('keeps question marks in POSIX paths', () => {
    expect(stripExt('foo/image?draft.png')).toBe('foo/image?draft')
  })
})

describe('extname', () => {
  it('should work well with path', () => {
    expect(extname('abc.txt')).toBe('.txt')
    expect(extname('中文.png')).toBe('.png')
    expect(extname('src/你好/世界.png')).toBe('.png')
  })
  it('should work well with no ext', () => {
    expect(extname('abc')).toBe('')
    expect(extname('/foo/.git/a')).toBe('')
  })
  it('should work well with complex ext', () => {
    expect(extname('abc.d.ts')).toBe('.ts')
    expect(extname('foo/.cache/abc.d.ts')).toBe('.ts')
    expect(extname('/foo/bar/.gitignore')).toBe('')
  })
  it('should work well with special characters', () => {
    expect(extname('foo/Artificial Axolotl 😡.svg')).toBe('.svg')
  })
  it('keeps question marks in POSIX paths', () => {
    expect(extname('foo/image?draft.png')).toBe('.png')
  })
})

describe('validatePathSegment', () => {
  it.each([
    ['.', 'The value cannot be . or ..'],
    ['..', 'The value cannot be . or ..'],
    ['a/b', 'The value must not contain /'],
    ['a\0b', 'The value contains an unsupported character']
  ])('explains why %j is rejected', (value, message) => {
    expect(validatePathSegment(value)).toMatchObject({ en: message })
  })

  it('accepts ordinary names', () => {
    expect(validatePathSegment('中文 😀')).toBeUndefined()
    expect(validatePathSegment('CON')).toBeUndefined()
    expect(validatePathSegment('a\\b')).toBeUndefined()
  })
})

describe('encodePathSegment', () => {
  it('escapes only path syntax and the escape marker', () => {
    expect(encodePathSegment('=/')).toBe('=%2F')
    expect(encodePathSegment('中文 😀')).toBe('中文 😀')
    expect(encodePathSegment('%2F')).toBe('%252F')
    expect(encodePathSegment('.')).toBe('%2E')
    expect(encodePathSegment('..')).toBe('%2E%2E')
  })
})

describe('encodeFilename', () => {
  it('uses path segment encoding after the extension is appended', () => {
    expect(encodeFilename('=/.svg')).toBe('=%2F.svg')
  })
})
