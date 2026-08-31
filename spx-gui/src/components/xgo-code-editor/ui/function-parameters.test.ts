import { describe, expect, it } from 'vitest'
import { readFunctionParameters } from './function-parameters'

describe('readFunctionParameters', () => {
  const prefix = 'func move'
  it.each([
    ['(x, y float64)', '(x,yfloat64)'],
    ['(\n x int,\n callback func(int, string) bool,\n)', '(xint,callbackfunc(int,string)bool,)'],
    [' /* note */ (x int /* ) */ , y ...int)', '(xint,y...int)'],
    ['(s struct { Value string `json:"(value)"` })', '(sstruct{Valuestring`json:"(value)"`})'],
    ['()', '()']
  ])('extracts %s without confusing nested syntax, comments or strings', (params, key) => {
    const code = prefix + params + ' int { return 0 }'
    const result = readFunctionParameters(code, prefix.length)!
    expect(result.key).toBe(key)
    expect(code.slice(result.start, result.end)).toBe(params.slice(params.indexOf('(')))
  })
  it.each(['(x int', ' /* unfinished', '(s struct { X string `unfinished })', ' = 3', ':= func(x int) {}'])(
    'does not invent a parameter list for %s',
    (suffix) => {
      expect(readFunctionParameters(prefix + suffix, prefix.length)).toBeNull()
    }
  )
})
