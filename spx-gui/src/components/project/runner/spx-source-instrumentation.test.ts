import { describe, expect, it } from 'vitest'
import { instrumentSpxSource } from './spx-source-instrumentation'

describe('instrumentSpxSource', () => {
  it('instruments executable statements at the top level', () => {
    const source = `step 80\nstep 80\nturn 90\nstepTo Mushroom`

    const instrumented = instrumentSpxSource('Lita.spx', source)

    expect(instrumented).toMatch(
      /fmt\.Println\("__XB_EXEC__start:Lita\.spx:1"\)\nstep 80\nfmt\.Println\("__XB_EXEC__end:Lita\.spx:1"\)/
    )
    expect(instrumented).toMatch(
      /fmt\.Println\("__XB_EXEC__start:Lita\.spx:2"\)\nstep 80\nfmt\.Println\("__XB_EXEC__end:Lita\.spx:2"\)/
    )
    expect(instrumented).toContain('fmt.Println("__XB_EXEC__start:Lita.spx:3")')
    expect(instrumented).toContain('fmt.Println("__XB_EXEC__start:Lita.spx:4")')
  })

  it('keeps top-level classfile declarations valid', () => {
    const source = `// IsMature\nfunc IsMature() bool {\n  return firstMature\n}\nonTouchStart "Lita", sprite => {\n  if IsMature() {\n    die\n  }\n}`

    const instrumented = instrumentSpxSource('Mushroom.spx', source)

    expect(instrumented).toContain('func IsMature() bool {')
    expect(instrumented).toContain('onTouchStart "Lita", sprite => {')
    expect(instrumented).not.toMatch(/fmt\.Println\("__XB_EXEC__start:Mushroom\.spx:2"\)\nfunc IsMature/)
    expect(instrumented).toMatch(
      /func IsMature\(\) bool \{\n\s+fmt\.Println\("__XB_EXEC__start:Mushroom\.spx:3"\)\n\s+return firstMature/
    )
    expect(instrumented).not.toMatch(/return firstMature\n\s+fmt\.Println\("__XB_EXEC__end:Mushroom\.spx:3"\)/)
    expect(instrumented).toMatch(
      /onTouchStart "Lita", sprite => \{\n\s+fmt\.Println\("__XB_EXEC__start:Mushroom\.spx:6"\)\n\s+if IsMature\(\) \{/
    )
  })

  it('does not instrument grouped top-level declarations', () => {
    const source = `var (
  mature bool
  collected bool
  mTime float64 = 1
)

onStart => {
  mature = true
}`

    const instrumented = instrumentSpxSource('Mushroom.spx', source)

    expect(instrumented).toContain('var (\n  mature bool\n  collected bool\n  mTime float64 = 1\n)')
    expect(instrumented).not.toMatch(/var \([\s\S]*__XB_EXEC__[\s\S]*\n\)/)
    expect(instrumented).toContain('fmt.Println("__XB_EXEC__start:Mushroom.spx:8")')
  })

  it('does not add a duplicate fmt import for grouped imports', () => {
    const source = `import (
  "fmt"
  "spx"
)

onStart => {
  step 10
}`

    const instrumented = instrumentSpxSource('Stage.spx', source)

    expect(instrumented.match(/^\s*"fmt"\s*$/gm)).toHaveLength(1)
    expect(instrumented).toContain('fmt.Println("__XB_EXEC__start:Stage.spx:7")')
  })

  it('does not instrument grouped constants', () => {
    const source = `const (
  maxMushrooms = 3
  maxPinecones = 5
)

step maxMushrooms`

    const instrumented = instrumentSpxSource('Stage.spx', source)

    expect(instrumented).toContain('const (\n  maxMushrooms = 3\n  maxPinecones = 5\n)')
    expect(instrumented).toContain('fmt.Println("__XB_EXEC__start:Stage.spx:6")')
  })

  it('does not instrument fields inside a struct declaration', () => {
    const source = `type State struct {
  mature bool
  collected bool
}

onStart => {
  println "ready"
}`

    const instrumented = instrumentSpxSource('Stage.spx', source)

    expect(instrumented).toContain('type State struct {\n  mature bool\n  collected bool\n}')
    expect(instrumented).not.toMatch(/mature bool\n\s+fmt\.Println/)
    expect(instrumented).toContain('fmt.Println("__XB_EXEC__start:Stage.spx:7")')
  })

  it('ignores braces inside strings and comments when tracking blocks', () => {
    const source = `onStart => {\n  println "{not a block}"\n  // }\n  println "done"\n}`
    const instrumented = instrumentSpxSource('Stage.spx', source)

    expect(instrumented.match(/__XB_EXEC__start/g)).toHaveLength(2)
  })
})
