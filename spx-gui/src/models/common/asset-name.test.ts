import { describe, it, expect } from 'vitest'
import {
  getSoundName,
  getSpriteName,
  normalizeAssetName,
  normalizeGopIdentifierAssetName
} from './asset-name'
import { Project } from '../project'
import { Sprite } from '../sprite'
import { Sound } from '../sound'
import { fromText } from './file'

describe('normalizeAssetName', () => {
  it('should work well with camel case', () => {
    expect(normalizeAssetName('abc', 'camel')).toBe('abc')
  })
  it('should work well with pascal case', () => {
    expect(normalizeAssetName('abc', 'pascal')).toBe('Abc')
  })
  it('should work well with empty string', () => {
    expect(normalizeAssetName('', 'camel')).toBe('')
    expect(normalizeAssetName('', 'pascal')).toBe('')
  })
  it('should work well with non-ascii chars', () => {
    expect(normalizeAssetName('中文-1', 'camel')).toBe('中文-1')
    expect(normalizeAssetName('中文 2', 'pascal')).toBe('中文 2')
  })
})

describe('normalizeGopIdentifierAssetName', () => {
  it('should work well with camel case', () => {
    expect(normalizeGopIdentifierAssetName('abc', 'camel')).toBe('abc')
    expect(normalizeGopIdentifierAssetName('abc def---ghi__jkl.mno', 'camel')).toBe(
      'abcDefGhiJklMno'
    )
    expect(normalizeGopIdentifierAssetName('', 'camel')).toBe('')
    expect(normalizeGopIdentifierAssetName('中文', 'camel')).toBe('')
    expect(normalizeGopIdentifierAssetName('中文en', 'camel')).toBe('en')
    expect(normalizeGopIdentifierAssetName('中文En', 'camel')).toBe('en')
    expect(normalizeGopIdentifierAssetName('abc中 文en', 'camel')).toBe('abcEn')
    expect(normalizeGopIdentifierAssetName('abc中 文en', 'camel')).toBe('abcEn')
    expect(normalizeGopIdentifierAssetName('123abc 456', 'camel')).toBe('abc456')
    expect(normalizeGopIdentifierAssetName(repeat('a', 120), 'camel')).toBe(repeat('a', 20))
  })
  it('should work well with pascal case', () => {
    expect(normalizeGopIdentifierAssetName('abc', 'pascal')).toBe('Abc')
    expect(normalizeGopIdentifierAssetName('abc def---ghi__jkl.mno', 'pascal')).toBe(
      'AbcDefGhiJklMno'
    )
    expect(normalizeGopIdentifierAssetName('', 'pascal')).toBe('')
    expect(normalizeGopIdentifierAssetName('中文', 'pascal')).toBe('')
    expect(normalizeGopIdentifierAssetName('中文en', 'pascal')).toBe('En')
    expect(normalizeGopIdentifierAssetName('中文En', 'pascal')).toBe('En')
    expect(normalizeGopIdentifierAssetName('abc中 文en', 'pascal')).toBe('AbcEn')
    expect(normalizeGopIdentifierAssetName('abc中 文en', 'pascal')).toBe('AbcEn')
    expect(normalizeGopIdentifierAssetName('123abc 456', 'pascal')).toBe('Abc456')
    expect(normalizeGopIdentifierAssetName(repeat('a', 120), 'pascal')).toBe('A' + repeat('a', 19))
  })
})

describe('getSpriteName', () => {
  it('should work well', () => {
    const project = new Project()
    expect(getSpriteName(project)).toBe('Sprite')
    project.addSprite(new Sprite('Sprite'))
    project.addSprite(new Sprite('Sprite3'))
    expect(getSpriteName(project)).toBe('Sprite2')
  })

  it('should work well with base', () => {
    const project = new Project()
    expect(getSpriteName(project, 'foo_bar')).toBe('FooBar')
    project.addSprite(new Sprite('FooBar'))
    project.addSprite(new Sprite('FooBar2'))
    expect(getSpriteName(project, 'foo_bar')).toBe('FooBar3')
    expect(getSpriteName(project, 'fooBar')).toBe('FooBar3')
    expect(getSpriteName(project, 'Foo  bar')).toBe('FooBar3')
  })
})

describe('getSoundName', () => {
  it('should work well', () => {
    const project = new Project()
    expect(getSoundName(project)).toBe('sound')
    project.addSound(new Sound('sound', mockFile()))
    project.addSound(new Sound('sound3', mockFile()))
    expect(getSoundName(project)).toBe('sound2')
  })

  it('should work well with base', () => {
    const project = new Project()
    expect(getSoundName(project, 'foo_bar')).toBe('fooBar')
    project.addSound(new Sound('fooBar', mockFile()))
    project.addSound(new Sound('fooBar2', mockFile()))
    expect(getSoundName(project, 'foo_bar')).toBe('fooBar3')
    expect(getSoundName(project, 'fooBar')).toBe('fooBar3')
    expect(getSoundName(project, 'Foo  bar')).toBe('fooBar3')
  })
})

function mockFile() {
  return fromText('', '')
}

function repeat(str: string, times: number) {
  return Array.from({ length: times + 1 }).join(str)
}
