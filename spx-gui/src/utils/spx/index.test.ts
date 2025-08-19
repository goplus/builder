import { describe, it, expect } from 'vitest'
import { normalizeXGoIdentifierAssetName } from '.'

describe('normalizeXGoIdentifierAssetName', () => {
  it('should work well with camel case', () => {
    expect(normalizeXGoIdentifierAssetName('abc', 'camel')).toBe('abc')
    expect(normalizeXGoIdentifierAssetName('abc def---ghi__jkl.mno', 'camel')).toBe('abcDefGhiJklMno')
    expect(normalizeXGoIdentifierAssetName('', 'camel')).toBe('')
    expect(normalizeXGoIdentifierAssetName('中文', 'camel')).toBe('中文')
    expect(normalizeXGoIdentifierAssetName('中文en', 'camel')).toBe('中文en')
    expect(normalizeXGoIdentifierAssetName('中文En', 'camel')).toBe('中文En')
    expect(normalizeXGoIdentifierAssetName('abc中 文en', 'camel')).toBe('abc中文en')
    expect(normalizeXGoIdentifierAssetName('abc中 文En', 'camel')).toBe('abc中文En')
    expect(normalizeXGoIdentifierAssetName('123abc 456', 'camel')).toBe('abc456')
    expect(normalizeXGoIdentifierAssetName(repeat('a', 120), 'camel')).toBe(repeat('a', 20))
  })
  it('should work well with pascal case', () => {
    expect(normalizeXGoIdentifierAssetName('abc', 'pascal')).toBe('Abc')
    expect(normalizeXGoIdentifierAssetName('abc def---ghi__jkl.mno', 'pascal')).toBe('AbcDefGhiJklMno')
    expect(normalizeXGoIdentifierAssetName('', 'pascal')).toBe('')
    expect(normalizeXGoIdentifierAssetName('中文', 'pascal')).toBe('中文')
    expect(normalizeXGoIdentifierAssetName('中文en', 'pascal')).toBe('中文en')
    expect(normalizeXGoIdentifierAssetName('中文En', 'pascal')).toBe('中文En')
    expect(normalizeXGoIdentifierAssetName('abc中 文en', 'pascal')).toBe('Abc中文en')
    expect(normalizeXGoIdentifierAssetName('abc中 文en', 'pascal')).toBe('Abc中文en')
    expect(normalizeXGoIdentifierAssetName('123abc 456', 'pascal')).toBe('Abc456')
    expect(normalizeXGoIdentifierAssetName(repeat('a', 120), 'pascal')).toBe('A' + repeat('a', 19))
  })
})

function repeat(str: string, times: number) {
  return Array.from({ length: times + 1 }).join(str)
}
