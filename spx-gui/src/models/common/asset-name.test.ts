import { describe, it, expect } from 'vitest'
import { getSoundName, getSpriteName, normalizeAssetName } from './asset-name'
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

describe('getSpriteName', () => {
  it('should work well', () => {
    const project = new Project()
    expect(getSpriteName(project)).toBe('MySprite')
    project.addSprite(new Sprite('MySprite'))
    project.addSprite(new Sprite('MySprite3'))
    expect(getSpriteName(project)).toBe('MySprite2')
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
