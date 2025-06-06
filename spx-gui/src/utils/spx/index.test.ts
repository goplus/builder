import { describe, it, expect } from 'vitest'
import { normalizeGopIdentifierAssetName } from '.'

describe('normalizeGopIdentifierAssetName', () => {
  it('should work well with camel case', () => {
    expect(normalizeGopIdentifierAssetName('abc', 'camel')).toBe('abc')
    expect(normalizeGopIdentifierAssetName('abc def---ghi__jkl.mno', 'camel')).toBe('abcDefGhiJklMno')
    expect(normalizeGopIdentifierAssetName('', 'camel')).toBe('')
    expect(normalizeGopIdentifierAssetName('中文', 'camel')).toBe('中文')
    expect(normalizeGopIdentifierAssetName('中文en', 'camel')).toBe('中文en')
    expect(normalizeGopIdentifierAssetName('中文En', 'camel')).toBe('中文En')
    expect(normalizeGopIdentifierAssetName('abc中 文en', 'camel')).toBe('abc中文en')
    expect(normalizeGopIdentifierAssetName('abc中 文En', 'camel')).toBe('abc中文En')
    expect(normalizeGopIdentifierAssetName('123abc 456', 'camel')).toBe('abc456')
    expect(normalizeGopIdentifierAssetName(repeat('a', 120), 'camel')).toBe(repeat('a', 20))
  })
  it('should work well with pascal case', () => {
    expect(normalizeGopIdentifierAssetName('abc', 'pascal')).toBe('Abc')
    expect(normalizeGopIdentifierAssetName('abc def---ghi__jkl.mno', 'pascal')).toBe('AbcDefGhiJklMno')
    expect(normalizeGopIdentifierAssetName('', 'pascal')).toBe('')
    expect(normalizeGopIdentifierAssetName('中文', 'pascal')).toBe('中文')
    expect(normalizeGopIdentifierAssetName('中文en', 'pascal')).toBe('中文en')
    expect(normalizeGopIdentifierAssetName('中文En', 'pascal')).toBe('中文En')
    expect(normalizeGopIdentifierAssetName('abc中 文en', 'pascal')).toBe('Abc中文en')
    expect(normalizeGopIdentifierAssetName('abc中 文en', 'pascal')).toBe('Abc中文en')
    expect(normalizeGopIdentifierAssetName('123abc 456', 'pascal')).toBe('Abc456')
    expect(normalizeGopIdentifierAssetName(repeat('a', 120), 'pascal')).toBe('A' + repeat('a', 19))
  })
})

function repeat(str: string, times: number) {
  return Array.from({ length: times + 1 }).join(str)
}
