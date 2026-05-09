import { describe, it, expect } from 'vitest'
import { getSoundName, getSpriteName, normalizeAssetName } from './asset-name'
import { SpxProject } from '../project'
import { Sprite } from '../sprite'
import { Sound } from '../sound'
import { fromText } from '../../common/file'

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
    expect(normalizeAssetName('Artificial Axolotl 😡', 'camel')).toBe('artificial Axolotl 😡')
    expect(normalizeAssetName('Artificial Axolotl 😡', 'pascal')).toBe('Artificial Axolotl 😡')
    expect(normalizeAssetName('😡123', 'camel')).toBe('😡123')
    expect(normalizeAssetName('😡123', 'pascal')).toBe('😡123')
  })
})

describe('getSpriteName', () => {
  it('should work well', () => {
    const project = new SpxProject()
    expect(getSpriteName(project, 'sprite')).toBe('Sprite')
    project.addSprite(new Sprite('Sprite'))
    project.addSprite(new Sprite('Sprite3'))
    expect(getSpriteName(project, 'sprite')).toBe('Sprite2')
  })

  it('should work well with base', () => {
    const project = new SpxProject()
    expect(getSpriteName(project, 'foo_bar')).toBe('FooBar')
    project.addSprite(new Sprite('FooBar'))
    project.addSprite(new Sprite('FooBar2'))
    expect(getSpriteName(project, 'foo_bar')).toBe('FooBar3')
    expect(getSpriteName(project, 'fooBar')).toBe('FooBar3')
    expect(getSpriteName(project, 'Foo  bar')).toBe('FooBar3')
  })

  it('should increment numeric suffix instead of appending to it', () => {
    const project = new SpxProject()
    project.addSprite(new Sprite('Sprite2'))
    project.addSprite(new Sprite('Sprite4'))
    expect(getSpriteName(project, 'sprite2')).toBe('Sprite3')
  })

  it('should fall back to english default name for empty base', () => {
    const project = new SpxProject()
    expect(getSpriteName(project, '')).toBe('Sprite1')
    project.addSprite(new Sprite('Sprite1'))
    expect(getSpriteName(project, '')).toBe('Sprite2')
  })
})

describe('getSoundName', () => {
  it('should work well', () => {
    const project = new SpxProject()
    expect(getSoundName(project, 'sound')).toBe('sound')
    project.addSound(new Sound('sound', mockFile()))
    project.addSound(new Sound('sound3', mockFile()))
    expect(getSoundName(project, 'sound')).toBe('sound2')
  })

  it('should work well with base', () => {
    const project = new SpxProject()
    expect(getSoundName(project, 'foo_bar')).toBe('foo_bar')
    project.addSound(new Sound('foo_bar', mockFile()))
    project.addSound(new Sound('foo_bar2', mockFile()))
    expect(getSoundName(project, 'foo_bar')).toBe('foo_bar3')
    expect(getSoundName(project, 'fooBar')).toBe('fooBar')
    expect(getSoundName(project, 'Foo  bar')).toBe('foo  bar')
  })

  it('should increment numeric suffix instead of appending to it', () => {
    const project = new SpxProject()
    project.addSound(new Sound('sound2', mockFile()))
    project.addSound(new Sound('sound4', mockFile()))
    expect(getSoundName(project, 'sound2')).toBe('sound3')
  })

  it('should fall back to english default name for empty base', () => {
    const project = new SpxProject()
    expect(getSoundName(project, '')).toBe('sound1')
    project.addSound(new Sound('sound1', mockFile()))
    expect(getSoundName(project, '')).toBe('sound2')
  })
})

function mockFile() {
  return fromText('', '')
}
