import { describe, expect, it } from 'vitest'
import { getTopLevelDeclarationOffset } from './utils'

describe('getTopLevelDeclarationOffset', () => {
  it.each([
    '',
    '// Sprite code\n',
    '/* onStart => {} */\n',
    'import "fmt"\n',
    'import "fmt"; ',
    'import fmt "fmt"\nimport . `math`\n',
    'import (\n"fmt"\n"math"\n)\n',
    'import (/* ) */ "fmt"; // )\n _ "example.com/a)b"\n)\n',
    'package main\n\nimport ("fmt")\n',
    'package main; import "fmt";\n'
  ])('places functions after the header %j and before event statements', (header) => {
    const code = `${header}onStart => {\n\tprintln "hi"\n}\n`
    const offset = getTopLevelDeclarationOffset(code)
    expect(code.slice(0, offset)).toBe(header)
    expect(code.slice(offset)).toBe('onStart => {\n\tprintln "hi"\n}\n')
  })

  it('does not mistake text in executable code for an import declaration', () => {
    expect(getTopLevelDeclarationOffset('println "import \\"fmt\\""\n')).toBe(0)
    expect(getTopLevelDeclarationOffset('onStart => {\n// import "fmt"\n}\n')).toBe(0)
    expect(getTopLevelDeclarationOffset('package游戏 := 1\nonStart => {}\n')).toBe(0)
    expect(getTopLevelDeclarationOffset('import资源 "a"\nonStart => {}\n')).toBe(0)
  })
})
