import { describe, expect, it } from 'vitest'
import { parseGoxMod, serializeGoxMod } from './gox-mod'

describe('gox.mod', () => {
  it('parses SPX registrations into framework metadata', () => {
    const config = parseGoxMod(`// Framework configuration
xgo 1.7.5
project main.spx Game github.com/goplus/spx/v3 math // inline import
class -embed -prefix=T *.spx SpriteImpl *Sprite
import ai github.com/goplus/builder/tools/ai
`)
    expect(config).toEqual({
      xgoVersion: '1.7.5',
      projects: [
        {
          projectClass: { ext: '.spx', pattern: 'main.spx', className: 'Game' },
          workClasses: [
            {
              ext: '.spx',
              pattern: '*.spx',
              className: 'SpriteImpl',
              prototype: '*Sprite',
              prefix: 'T',
              embedded: true
            }
          ],
          pkgPaths: ['github.com/goplus/spx/v3', 'math'],
          autoImports: [{ name: 'ai', path: 'github.com/goplus/builder/tools/ai' }],
          flat: false,
          pack: null,
          autoLambdas: {}
        }
      ]
    })
    expect(parseGoxMod(serializeGoxMod(config))).toEqual(config)
  })

  it('round-trips multiple projects, grouped declarations, pack, and autolambda', () => {
    const config = parseGoxMod(`gop 1.7
project _course.gox Course example.com/tutorial
import (
  "example.com/plain"
  "alias" "example.com/aliased"
)
pack "assets with spaces" index.json
autolambda times(1), forEver(0)
autolambda onKey(1)
project -flat *.scene Scene example.com/scene
project example.com/implicit
class *_worker.gox Worker
`)
    expect(config.projects).toHaveLength(3)
    expect(config.projects[0].projectClass.ext).toBe('_course.gox')
    expect(config.projects[0].autoLambdas).toEqual({ times: 1, forEver: 0, onKey: 1 })
    expect(config.projects[0].pack).toEqual({ directory: 'assets with spaces', indexFile: 'index.json' })
    expect(config.projects[1].flat).toBe(true)
    expect(config.projects[2].projectClass.className).toBe('')
    expect(serializeGoxMod(config)).toContain('autolambda times(1), forEver(0), onKey(1)\n')
    expect(parseGoxMod(serializeGoxMod(config))).toEqual(config)
  })

  it('handles quoted strings, Go escapes, and comment markers inside strings', () => {
    const config = parseGoxMod(String.raw`project .gox App example.com/framework
import "a\x69" "example.com/path//name"
pack "assets\040with\u0020spaces" "index\056json"
`)
    expect(config.projects[0].autoImports).toEqual([{ name: 'ai', path: 'example.com/path//name' }])
    expect(config.projects[0].pack).toEqual({ directory: 'assets with spaces', indexFile: 'index.json' })
    expect(parseGoxMod(serializeGoxMod(config))).toEqual(config)
  })

  it('accepts empty configuration for ordinary XGo', () => {
    expect(parseGoxMod('// No custom frameworks')).toEqual({ xgoVersion: null, projects: [] })
    expect(serializeGoxMod(parseGoxMod(''))).toBe('')
  })

  it.each([
    'class *.gox Worker',
    'project',
    'project -unknown .gox App example.com/framework',
    'project .gox App',
    'project .gox App example.com/framework )',
    'project .gox invalid example.com/framework',
    'xgo 1.7\nxgo 1.8',
    'xgo invalid',
    'project .gox App example.com/framework\nclass -unknown *.gox Worker',
    'project -flat .gox App example.com/framework\nclass *.gox Worker',
    'project .gox App example.com/framework\nimport',
    'project .gox App example.com/framework\nimport ""',
    'project .gox App example.com/framework\npack ../assets index.json',
    'project .gox App example.com/framework\npack assets dir/index.json',
    'project .gox App example.com/framework\npack assets index.json\npack data index.json',
    'project .gox App example.com/framework\nautolambda times(-1)',
    'project .gox App example.com/framework\nautolambda times(1),',
    'project .gox App example.com/framework\nautolambda times(1), times(2)',
    'project .gox App example.com/framework\nunknown value',
    'project .gox App "unterminated',
    'import (\n',
    ')'
  ])('rejects invalid declarations: %s', (source) => {
    expect(() => parseGoxMod(source)).toThrow(/gox\.mod/)
  })
})
