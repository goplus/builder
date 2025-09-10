import { describe, it, expect } from 'vitest'
import { resolve, filename, stripExt } from './path'

describe('resolve', () => {
  it('should work well with path', () => {
    expect(resolve('foo', 'bar')).toBe('foo/bar')
    expect(resolve('foo', 'bar', 'baz')).toBe('foo/bar/baz')
    expect(resolve('/foo/bar', 'baz')).toBe('/foo/bar/baz')
    expect(resolve('/foo/bar', 'baz', 'qux')).toBe('/foo/bar/baz/qux')
  })
  it('should work well with url', () => {
    expect(resolve('https://test.com/foo', 'bar')).toBe('https://test.com/foo/bar')
    expect(resolve('https://test.com/foo', 'bar', 'baz')).toBe('https://test.com/foo/bar/baz')
    expect(resolve('https://test.com/foo/bar', 'baz')).toBe('https://test.com/foo/bar/baz')
    expect(resolve('https://test.com/foo/bar', 'baz', 'qux')).toBe('https://test.com/foo/bar/baz/qux')
  })
  it('should work well with no path', () => {
    expect(resolve('foo')).toBe('foo')
    expect(resolve('https://test.com/foo')).toBe('https://test.com/foo')
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
  it('should work well with url', () => {
    expect(filename('https://test.com/abc.txt')).toBe('abc.txt')
    expect(filename('https://test.com/foo/%E4%B8%AD%E6%96%87.png')).toBe('%E4%B8%AD%E6%96%87.png')
  })
  it('should work well with no ext', () => {
    expect(filename('abc')).toBe('abc')
    expect(filename('/foo/.git/a')).toBe('a')
    expect(filename('https://test.com/project/foo')).toBe('foo')
  })
  it('should work well with complex ext', () => {
    expect(filename('foo/abc.d.ts')).toBe('abc.d.ts')
    expect(filename('foo/.cache/abc.d.ts')).toBe('abc.d.ts')
    expect(filename('/foo/bar/.gitignore')).toBe('.gitignore')
  })
  it('should work well with special characters', () => {
    expect(filename('foo/Artificial Axolotl 😡.svg')).toBe('Artificial Axolotl 😡.svg')
  })
})

describe('stripExt', () => {
  it('should work well with path', () => {
    expect(stripExt('abc.txt')).toBe('abc')
    expect(stripExt('中文.png')).toBe('中文')
    expect(stripExt('src/你好/世界.png')).toBe('src/你好/世界')
  })
  it('should work well with url', () => {
    expect(stripExt('https://test.com/abc.txt')).toBe('https://test.com/abc')
    expect(stripExt('https://test.com/foo/%E4%B8%AD%E6%96%87.png')).toBe('https://test.com/foo/%E4%B8%AD%E6%96%87')
  })
  it('should work well with no ext', () => {
    expect(stripExt('abc')).toBe('abc')
    expect(stripExt('/foo/.git/a')).toBe('/foo/.git/a')
    expect(stripExt('https://test.com/project/foo')).toBe('https://test.com/project/foo')
  })
  it('should work well with complex ext', () => {
    expect(stripExt('abc.d.ts')).toBe('abc.d')
    expect(stripExt('foo/.cache/abc.d.ts')).toBe('foo/.cache/abc.d')
    expect(stripExt('/foo/bar/.gitignore')).toBe('/foo/bar/.gitignore')
  })
  it('should work well with special characters', () => {
    expect(stripExt('foo/Artificial Axolotl 😡.svg')).toBe('foo/Artificial Axolotl 😡')
  })
})
